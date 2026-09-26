import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { funding, project, reward, user } from "@/db/schema";
import { takeRewardStock } from "@/lib/reward-stock";
import { uniq } from "./unique";

// 트랜잭션 테스트는 여러 연결이 실제로 저장(commit)해야 해서 "끝나면 되돌리기"를 쓸 수 없다.
// 대신 테스트용 데이터를 진짜로 만들고, 테스트가 끝날 때마다 지운다.

// 동시에 10명이 사려면 연결이 10개 필요하다
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 12 });
const db = drizzle({ client: pool, schema });

const created = { users: [] as string[], projects: [] as number[] };

async function setup(limitQty: number | null) {
  const creatorId = uniq("tx-test");
  await db.insert(user).values({ id: creatorId, name: "트랜잭션 테스트", email: `${creatorId}@example.com` });
  created.users.push(creatorId);
  const [{ id: projectId }] = await db
    .insert(project)
    .values({ creatorId, title: "트랜잭션 테스트", summary: "s", category: "living", goalAmount: 100_000, deadline: "2099-12-31", imageUrl: "https://example.com/a.jpg" })
    .returning({ id: project.id });
  created.projects.push(projectId);
  const [{ id: rewardId }] = await db
    .insert(reward)
    .values({ projectId, title: "한정 리워드", price: 10_000, limitQty, deliveryMonth: "2099-01-01" })
    .returning({ id: reward.id });
  return { creatorId, projectId, rewardId };
}

const soldQtyOf = async (rewardId: number) =>
  (await db.select({ n: reward.soldQty }).from(reward).where(eq(reward.id, rewardId)))[0].n;

afterEach(async () => {
  // 자식 → 부모 순서로 지운다 (후원 → 프로젝트(리워드는 cascade) → 사용자)
  if (created.projects.length) {
    await db.delete(funding).where(inArray(funding.projectId, created.projects));
    await db.delete(project).where(inArray(project.id, created.projects));
  }
  if (created.users.length) await db.delete(user).where(inArray(user.id, created.users));
  created.users = [];
  created.projects = [];
});
afterAll(() => pool.end());

describe("조건부 차감 takeRewardStock", () => {
  it("남아 있으면 줄이고 true, 모자라면 그대로 두고 false", async () => {
    const { rewardId } = await setup(3);
    expect(await takeRewardStock(db, rewardId, 2)).toBe(true);
    expect(await takeRewardStock(db, rewardId, 2)).toBe(false); // 2 + 2 > 3
    expect(await takeRewardStock(db, rewardId, 1)).toBe(true);
    expect(await soldQtyOf(rewardId)).toBe(3);
  });

  it("무제한 리워드는 항상 성공한다", async () => {
    const { rewardId } = await setup(null);
    expect(await takeRewardStock(db, rewardId, 5)).toBe(true);
  });
});

describe("트랜잭션: 둘 다 되거나, 둘 다 안 되거나", () => {
  it("트랜잭션이 없으면: 두 번째 작업이 실패해도 첫 번째 작업(재고 차감)은 남는다 ← 문제", async () => {
    const { rewardId, projectId, creatorId } = await setup(10);
    await takeRewardStock(db, rewardId, 1); // ① 재고 차감 — 바로 저장됨
    // ② 후원 저장 — 금액이 규칙(1,000원 이상)에 어긋나 실패
    await expect(db.insert(funding).values({ projectId, supporterId: creatorId, amount: 10, orderId: `tx-a-${rewardId}` })).rejects.toThrow();
    expect(await soldQtyOf(rewardId)).toBe(1); // 후원은 없는데 재고만 줄어 있다
  });

  it("트랜잭션 안에서는: 두 번째 작업이 실패하면 첫 번째 작업도 되돌아간다", async () => {
    const { rewardId, projectId, creatorId } = await setup(10);
    await expect(
      db.transaction(async (tx) => {
        await takeRewardStock(tx, rewardId, 1); // ①
        await tx.insert(funding).values({ projectId, supporterId: creatorId, amount: 10, orderId: `tx-b-${rewardId}` }); // ② 실패
      }),
    ).rejects.toThrow();
    expect(await soldQtyOf(rewardId)).toBe(0); // ①도 함께 취소됨
  });
});

describe("동시성: 남은 1개를 여러 명이 동시에", () => {
  it("⭐ 10명이 동시에 사도 딱 1명만 성공하고, 판매 수량은 1", async () => {
    const { rewardId } = await setup(1);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => db.transaction((tx) => takeRewardStock(tx, rewardId, 1))),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await soldQtyOf(rewardId)).toBe(1);
  });
});
