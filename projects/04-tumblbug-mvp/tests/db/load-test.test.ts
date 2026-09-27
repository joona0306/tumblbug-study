import { like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { user } from "@/db/schema";
import { cleanupLoadTest, confirmLoadTestOrder, loadTestResult, setupLoadTest, slowApprovingToss } from "@/lib/load-test";
import { db, pool } from "./payment-helpers";

// 부하 테스트 준비·승인·결과·정리가 맞게 동작하는지 (k6 로 돌리기 전에 작은 규모로 — 16주차)
afterAll(async () => {
  await cleanupLoadTest(db);
  await pool.end();
});

describe("부하 테스트 도구 (lib/load-test)", () => {
  it("남은 1개를 10명이 동시에 승인해도 1명만 성공, 9명은 품절", async () => {
    const s = await setupLoadTest(db, { buyers: 10, stock: 1 });
    const toss = slowApprovingToss(50);

    const results = await Promise.all(s.orders.map((order) => confirmLoadTestOrder(db, toss, order))); // 동시에
    expect(results.filter((r) => r.status === "paid")).toHaveLength(1);
    expect(await loadTestResult(db, s.projectId)).toEqual({ soldQty: 1, limitQty: 1, paid: 1, soldOut: 9, other: 0 });
  });

  it("준비를 다시 하면 이전 시험 데이터는 지워지고, 정리하면 시험 계정이 남지 않는다", async () => {
    const first = await setupLoadTest(db, { buyers: 3, stock: 1 });
    const second = await setupLoadTest(db, { buyers: 3, stock: 1 });
    expect(second.projectId).not.toBe(first.projectId);
    expect(await loadTestResult(db, first.projectId)).toMatchObject({ paid: 0, soldOut: 0, other: 0 }); // 첫 번째 것은 사라졌다

    await cleanupLoadTest(db);
    expect(await db.select().from(user).where(like(user.email, "%@loadtest.moa.test"))).toHaveLength(0);
  });
});
