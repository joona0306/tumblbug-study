import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { project, reward } from "@/db/schema";
import { addDays, kstToday } from "@/lib/dates";
import { quoteFunding } from "@/lib/funding/quote";
import type { FundingDraftInput } from "@/lib/validation/funding";
import { closePool, makeProject, makeReward, makeUser, type TestDb, withRollback } from "./helpers";

afterAll(closePool);

const SHIPPING = { recipientName: "김모아", recipientPhone: "010-1234-5678", address: "서울시 중구 세종대로 1" };

// 창작자·후원자·프로젝트·리워드(30,000원, 10개 한정) 준비
async function setup(db: TestDb) {
  const creator = await makeUser(db);
  const supporter = await makeUser(db);
  const projectId = await makeProject(db, creator);
  const rewardId = await makeReward(db, projectId, 10);
  const draft: FundingDraftInput = { projectId, rewardId, quantity: 2, extraAmount: 1_000, shipping: SHIPPING, message: "" };
  return { creator, supporter, projectId, rewardId, draft };
}

describe("결제 직전 서버 검사 (quoteFunding)", () => {
  it("총액은 서버가 DB의 가격으로 다시 계산한다", () =>
    withRollback(async (db) => {
      const { supporter, draft } = await setup(db);
      expect(await quoteFunding(db, supporter, draft)).toEqual({ ok: true, amount: 61_000, rewardId: draft.rewardId, quantity: 2, needsShipping: true });
    }));

  it("그 사이 리워드 가격이 바뀌면 바뀐 가격으로 계산한다", () =>
    withRollback(async (db) => {
      const { supporter, rewardId, draft } = await setup(db);
      await db.update(reward).set({ price: 25_000 }).where(eq(reward.id, rewardId));
      expect(await quoteFunding(db, supporter, draft)).toMatchObject({ ok: true, amount: 51_000 });
    }));

  it("다른 프로젝트의 리워드 번호를 끼워 넣으면 거절", () =>
    withRollback(async (db) => {
      const { creator, supporter, draft } = await setup(db);
      const otherReward = await makeReward(db, await makeProject(db, creator), null);
      expect(await quoteFunding(db, supporter, { ...draft, rewardId: otherReward })).toMatchObject({ ok: false, step: 1 });
    }));

  it("남은 수량보다 많이 고르면 거절 (그 사이 다른 사람이 사 갔을 때)", () =>
    withRollback(async (db) => {
      const { supporter, rewardId, draft } = await setup(db);
      await db.update(reward).set({ soldQty: 9 }).where(eq(reward.id, rewardId)); // 1개 남음
      expect(await quoteFunding(db, supporter, draft)).toEqual({ ok: false, error: "수량은 1~1개로 골라 주세요", step: 1 });
      await db.update(reward).set({ soldQty: 10 }).where(eq(reward.id, rewardId)); // 품절
      expect(await quoteFunding(db, supporter, draft)).toEqual({ ok: false, error: "이 리워드는 품절됐어요", step: 1 });
    }));

  it("배송이 필요한 리워드인데 배송지가 비었으면 2단계로", () =>
    withRollback(async (db) => {
      const { supporter, draft } = await setup(db);
      const noShipping = { ...draft, shipping: { recipientName: "", recipientPhone: "", address: "" } };
      expect(await quoteFunding(db, supporter, noShipping)).toMatchObject({ ok: false, step: 2 });
    }));

  it("리워드 없이 후원: 배송지 없이 통과, 1,000원 미만은 거절", () =>
    withRollback(async (db) => {
      const { supporter, draft } = await setup(db);
      const base = { ...draft, rewardId: null, quantity: 1, shipping: { recipientName: "", recipientPhone: "", address: "" } };
      expect(await quoteFunding(db, supporter, { ...base, extraAmount: 5_000 })).toMatchObject({ ok: true, amount: 5_000, needsShipping: false });
      expect(await quoteFunding(db, supporter, { ...base, extraAmount: 500 })).toMatchObject({ ok: false, step: 1 });
    }));

  it("마감·숨김·내 프로젝트는 후원할 수 없다", () =>
    withRollback(async (db) => {
      const { creator, supporter, projectId, draft } = await setup(db);
      expect(await quoteFunding(db, creator, draft)).toMatchObject({ ok: false, error: "내 프로젝트에는 후원할 수 없어요" });

      await db.update(project).set({ deadline: addDays(kstToday(), -1) }).where(eq(project.id, projectId));
      expect(await quoteFunding(db, supporter, draft)).toMatchObject({ ok: false, error: "마감된 프로젝트예요" });

      await db.update(project).set({ deadline: "2099-12-31", hidden: true }).where(eq(project.id, projectId));
      expect(await quoteFunding(db, supporter, draft)).toMatchObject({ ok: false, step: null });
    }));
});
