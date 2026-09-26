import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { funding, project, projectLike, reward, user } from "@/db/schema";
import { PG, closePool, expectRejected, makeProject, makeReward, makeUser, withRollback } from "./helpers";

// 물리 ERD에 새긴 규칙을 진짜 DB로 확인한다.
// "앱 코드가 실수해도 DB가 막아 주는가?" — 각 테스트가 끝나면 되돌리므로 DB에 흔적이 남지 않는다.

afterAll(closePool);

describe("리워드", () => {
  it("⭐ 판매 수량이 한정 수량을 넘으면 DB가 거절한다 (초과 판매 방지)", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const rewardId = await makeReward(db, projectId, 1);
      await db.update(reward).set({ soldQty: 1 }).where(eq(reward.id, rewardId)); // 마지막 1개 판매: 통과
      await expectRejected(
        db.update(reward).set({ soldQty: sql`${reward.soldQty} + 1` }).where(eq(reward.id, rewardId)),
        PG.CHECK,
        "reward_sold_check",
      );
    }));

  it("무제한(NULL) 리워드는 얼마든지 팔 수 있다", () =>
    withRollback(async (db) => {
      const rewardId = await makeReward(db, await makeProject(db, await makeUser(db)), null);
      await db.update(reward).set({ soldQty: 9999 }).where(eq(reward.id, rewardId));
    }));

  it("가격이 1,000원보다 작으면 거절한다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      await expectRejected(
        db.insert(reward).values({ projectId, title: "x", price: 500, deliveryMonth: "2099-01-01" }),
        PG.CHECK,
        "reward_price_check",
      );
    }));
});

describe("프로젝트", () => {
  it("정해진 카테고리가 아니면 거절한다", () =>
    withRollback(async (db) => {
      const creatorId = await makeUser(db);
      await expectRejected(
        db.execute(sql`insert into project (creator_id, title, summary, category, goal_amount, deadline, image_url)
          values (${creatorId}, 't', 's', 'food', 100000, '2099-12-31', 'https://example.com/a.jpg')`),
        PG.CHECK,
        "project_category_check",
      );
    }));

  it("프로젝트가 있는 창작자는 지울 수 없다 (restrict)", () =>
    withRollback(async (db) => {
      const creatorId = await makeUser(db);
      await makeProject(db, creatorId);
      await expectRejected(db.delete(user).where(eq(user.id, creatorId)), PG.RESTRICT);
    }));

  it("프로젝트를 지우면 리워드도 함께 지워진다 (cascade)", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      await makeReward(db, projectId, 10);
      await db.delete(project).where(eq(project.id, projectId));
      expect(await db.select().from(reward).where(eq(reward.projectId, projectId))).toHaveLength(0);
    }));
});

describe("후원", () => {
  const base = (projectId: number, supporterId: string, orderId: string) => ({ projectId, supporterId, amount: 30_000, orderId });

  it("금액이 1,000원보다 작으면 거절한다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const supporterId = await makeUser(db);
      await expectRejected(
        db.insert(funding).values({ ...base(projectId, supporterId, "order-a"), amount: 500 }),
        PG.CHECK,
        "funding_amount_check",
      );
    }));

  it("결제 완료(paid)인데 결제 키가 없으면 거절한다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const supporterId = await makeUser(db);
      await expectRejected(
        db.insert(funding).values({ ...base(projectId, supporterId, "order-b"), status: "paid" }),
        PG.CHECK,
        "funding_paid_check",
      );
    }));

  it("같은 주문 번호는 두 번 저장할 수 없다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const supporterId = await makeUser(db);
      await db.insert(funding).values(base(projectId, supporterId, "order-c"));
      await expectRejected(db.insert(funding).values(base(projectId, supporterId, "order-c")), PG.UNIQUE, "funding_order_id_unique");
    }));

  it("후원 기록이 있는 프로젝트는 지울 수 없다 (restrict)", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      await db.insert(funding).values(base(projectId, await makeUser(db), "order-d"));
      await expectRejected(db.delete(project).where(eq(project.id, projectId)), PG.RESTRICT);
    }));
});

describe("찜", () => {
  it("같은 프로젝트를 두 번 찜할 수 없다 (복합 기본 키)", () =>
    withRollback(async (db) => {
      const userId = await makeUser(db);
      const projectId = await makeProject(db, await makeUser(db));
      await db.insert(projectLike).values({ userId, projectId });
      await expectRejected(db.insert(projectLike).values({ userId, projectId }), PG.UNIQUE, "project_like_user_id_project_id_pk");
    }));
});
