import { afterAll, describe, expect, it } from "vitest";
import { funding, reward } from "@/db/schema";
import { addDays, kstToday } from "@/lib/dates";
import { getDailyRaised, getDashboardSummary, getRewardBreakdown, listSupporters } from "@/lib/queries/dashboard";
import { closePool, makeProject, makeReward, makeUser, type TestDb, withRollback } from "./helpers";
import { uniq } from "./unique";

afterAll(closePool);

// 한국 시간 날짜 + 시각 → 그 순간
const kst = (date: string, time = "12:00") => new Date(`${date}T${time}:00+09:00`);

async function setup(db: TestDb) {
  const creator = await makeUser(db);
  const [a, b] = [await makeUser(db), await makeUser(db)];
  const projectId = await makeProject(db, creator);
  const rewardId = await makeReward(db, projectId, 10); // 30,000원
  return { a, b, projectId, rewardId };
}

const order = () => uniq("dash");

describe("창작자 대시보드 집계", () => {
  it("요약: 결제 완료만 센다 (후원자는 사람 수, 건수는 후원 수)", () =>
    withRollback(async (db) => {
      const { a, b, projectId, rewardId } = await setup(db);
      const paid = { projectId, status: "paid" as const, paidAt: new Date() };
      await db.insert(funding).values([
        { ...paid, supporterId: a, rewardId, amount: 30_000, orderId: order(), paymentKey: order() },
        { ...paid, supporterId: a, rewardId: null, amount: 5_000, orderId: order(), paymentKey: order() }, // 같은 사람이 한 번 더
        { ...paid, supporterId: b, rewardId, quantity: 2, amount: 61_000, orderId: order(), paymentKey: order() },
        { projectId, supporterId: b, rewardId, amount: 30_000, orderId: order() }, // 결제 대기 → 빠짐
      ]);
      expect(await getDashboardSummary(db, projectId)).toMatchObject({ raised: 96_000, supporters: 2, fundings: 3, average: 32_000 });
    }));

  it("후원이 없으면 0 (LEFT JOIN + coalesce)", () =>
    withRollback(async (db) => {
      const { projectId } = await setup(db);
      expect(await getDashboardSummary(db, projectId)).toMatchObject({ raised: 0, supporters: 0, fundings: 0, average: 0 });
    }));

  it("날짜별 모금: 한국 시간으로 자르고, 후원이 없는 날도 0으로 14일 모두", () =>
    withRollback(async (db) => {
      const { a, projectId } = await setup(db);
      const today = kstToday();
      const yesterday = addDays(today, -1);
      const paid = { projectId, supporterId: a, status: "paid" as const };
      await db.insert(funding).values([
        { ...paid, amount: 10_000, orderId: order(), paymentKey: order(), paidAt: kst(today, "00:30") }, // UTC 로는 "어제" 15:30
        { ...paid, amount: 20_000, orderId: order(), paymentKey: order(), paidAt: kst(yesterday, "23:50") },
        { ...paid, amount: 3_000, orderId: order(), paymentKey: order(), paidAt: kst(addDays(today, -20)) }, // 14일 밖
      ]);

      const days = await getDailyRaised(db, projectId);
      expect(days).toHaveLength(14);
      expect(days[0].day).toBe(addDays(today, -13));
      expect(days.at(-1)).toEqual({ day: today, amount: 10_000, count: 1 });
      expect(days.at(-2)).toEqual({ day: yesterday, amount: 20_000, count: 1 });
      expect(days.slice(0, -2).every((d) => d.amount === 0)).toBe(true);
    }));

  it("리워드별 판매 + 리워드 없이 후원", () =>
    withRollback(async (db) => {
      const { a, projectId, rewardId } = await setup(db);
      const [{ id: unsold }] = await db.insert(reward).values({ projectId, title: "안 팔린 리워드", price: 50_000, deliveryMonth: "2099-01-01", sortOrder: 1 }).returning({ id: reward.id });
      const paid = { projectId, supporterId: a, status: "paid" as const, paidAt: new Date() };
      await db.insert(funding).values([
        { ...paid, rewardId, quantity: 2, amount: 60_000, orderId: order(), paymentKey: order() },
        { ...paid, rewardId: null, amount: 7_000, orderId: order(), paymentKey: order() },
      ]);

      const { rewards, noReward } = await getRewardBreakdown(db, projectId);
      expect(rewards.map((r) => [r.id, r.paidQty, r.revenue])).toEqual([
        [rewardId, 2, 60_000],
        [unsold, 0, 0],
      ]);
      expect(noReward).toEqual({ count: 1, revenue: 7_000 });
    }));

  it("후원자·배송지 목록: 결제 완료만", () =>
    withRollback(async (db) => {
      const { a, b, projectId, rewardId } = await setup(db);
      const shipping = { recipientName: "김모아", recipientPhone: "010-1234-5678", address: "서울시 중구" };
      await db.insert(funding).values([
        { projectId, supporterId: a, rewardId, amount: 30_000, orderId: order(), paymentKey: order(), status: "paid", paidAt: new Date(), ...shipping },
        { projectId, supporterId: b, rewardId, amount: 30_000, orderId: order(), status: "failed", ...shipping },
      ]);
      const rows = await listSupporters(db, projectId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ rewardTitle: "리워드", address: "서울시 중구" });
    }));
});
