import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { funding, paymentEvent, project, reward } from "@/db/schema";
import { addDays, kstToday } from "@/lib/dates";
import { findPaymentMismatches, findStalePendings, findStockMismatches, findUnfinalizedProjects } from "@/lib/ops/checks";
import { closePool, makeProject, makeReward, makeUser, withRollback } from "./helpers";
import { uniq } from "./unique";

afterAll(closePool);

describe("운영 점검", () => {
  it("① 재고: 결제 완료 + 승인 중인 수량 = 판매 수면 정상, 다르면 찾아낸다", () =>
    withRollback(async (db) => {
      const s = await makeUser(db);
      const projectId = await makeProject(db, await makeUser(db));
      const rewardId = await makeReward(db, projectId, 10);
      const base = { projectId, supporterId: s, rewardId, amount: 30_000 };
      await db.insert(funding).values([
        { ...base, quantity: 2, orderId: uniq("o"), status: "paid", paymentKey: uniq("k"), paidAt: new Date() },
        { ...base, quantity: 1, orderId: uniq("o"), paymentKey: uniq("k") }, // 승인 중 → 재고를 잡고 있다
        { ...base, quantity: 3, orderId: uniq("o"), status: "failed" }, // 실패 → 세지 않는다
        { ...base, quantity: 1, orderId: uniq("o") }, // 결제창 단계 → 세지 않는다
      ]);
      await db.update(reward).set({ soldQty: 3 }).where(eq(reward.id, rewardId));
      expect((await findStockMismatches(db)).filter((r) => r.reward_id === rewardId)).toEqual([]);

      await db.update(reward).set({ soldQty: 6 }).where(eq(reward.id, rewardId)); // 실패한 3개를 안 되돌린 것처럼
      expect((await findStockMismatches(db)).filter((r) => r.reward_id === rewardId)).toEqual([{ reward_id: rewardId, title: "리워드", sold_qty: 6, held_qty: 3 }]);
    }));

  it("② 결제 상태: 토스 DONE 인데 DB 는 결제 완료가 아니면 찾아낸다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const [ok, bad] = [uniq("o"), uniq("o")];
      await db.insert(funding).values([
        { projectId, supporterId: await makeUser(db), amount: 5_000, orderId: ok, status: "paid", paymentKey: uniq("k"), paidAt: new Date() },
        { projectId, supporterId: await makeUser(db), amount: 5_000, orderId: bad, status: "failed" },
      ]);
      await db.insert(paymentEvent).values([
        { eventId: uniq("e"), orderId: ok, status: "DONE", payload: {} },
        { eventId: uniq("e"), orderId: bad, status: "DONE", payload: {} },
      ]);
      const mine = (await findPaymentMismatches(db)).filter((r) => [ok, bad].includes(r.order_id));
      expect(mine.map((r) => [r.order_id, r.funding_status])).toEqual([[bad, "failed"]]);
    }));

  it("③ 예약 작업: 마감이 하루 넘게 지났는데 모금중이면 찾아낸다 (어제 마감은 아직 괜찮다)", () =>
    withRollback(async (db) => {
      const creator = await makeUser(db);
      const [late, recent] = [await makeProject(db, creator), await makeProject(db, creator)];
      await db.update(project).set({ deadline: addDays(kstToday(), -3) }).where(eq(project.id, late));
      await db.update(project).set({ deadline: addDays(kstToday(), -1) }).where(eq(project.id, recent));
      const ids = (await findUnfinalizedProjects(db)).map((r) => r.id);
      expect(ids).toContain(late);
      expect(ids).not.toContain(recent);
    }));

  it("④ 하루 넘게 결제 대기로 남은 후원을 찾아낸다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const [old, fresh] = [uniq("o"), uniq("o")];
      await db.insert(funding).values([
        { projectId, supporterId: await makeUser(db), amount: 5_000, orderId: old, createdAt: sql`now() - interval '2 days'` },
        { projectId, supporterId: await makeUser(db), amount: 5_000, orderId: fresh },
      ]);
      const orders = (await findStalePendings(db)).map((r) => r.order_id);
      expect(orders).toContain(old);
      expect(orders).not.toContain(fresh);
    }));
});
