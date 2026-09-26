import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { funding, project, rateLimit } from "@/db/schema";
import { cleanupRateLimits, expireStalePendings, finalizeProjectStatuses } from "@/lib/cron/daily";
import { addDays, kstToday } from "@/lib/dates";
import type { TossResult } from "@/lib/payments/toss";
import { makeProject, makeUser, withRollback } from "./helpers";
import { cleanup, db, fakeToss, fundingOf, pendingFunding, pool, setup, soldQtyOf } from "./payment-helpers";

// 예약 작업 테스트 — ① 상태 확정·③ 청소는 "끝나면 되돌리기", ② 결제 대기 정리는 트랜잭션을 쓰므로 진짜 저장 후 지운다
afterEach(cleanup);
afterAll(() => pool.end());

describe("① 마감된 프로젝트 상태 확정", () => {
  it("마감이 지난 것만 목표 달성 여부로 확정, 두 번 돌려도 같은 결과", () =>
    withRollback(async (tx) => {
      const creator = await makeUser(tx);
      const supporter = await makeUser(tx);
      const today = kstToday();
      const [reached, missed, endsToday] = [await makeProject(tx, creator), await makeProject(tx, creator), await makeProject(tx, creator)];
      await tx.update(project).set({ deadline: addDays(today, -1) }).where(inArray(project.id, [reached, missed]));
      await tx.update(project).set({ deadline: today }).where(eq(project.id, endsToday)); // 오늘 23:59 까지 → 아직
      await tx.insert(funding).values({ projectId: reached, supporterId: supporter, amount: 1_000_000, orderId: `cron-${reached}`, status: "paid", paymentKey: `cron-${reached}`, paidAt: new Date() }); // 목표 100만원 딱

      const mine = (rows: { id: number; status: string }[]) => rows.filter((r) => [reached, missed, endsToday].includes(r.id)).sort((a, b) => a.id - b.id);
      expect(mine(await finalizeProjectStatuses(tx))).toEqual([
        { id: reached, status: "success" },
        { id: missed, status: "failed" },
      ]);
      expect(mine(await finalizeProjectStatuses(tx))).toEqual([]); // 이미 확정된 줄은 건드리지 않는다
      const [row] = await tx.select({ status: project.status }).from(project).where(eq(project.id, endsToday));
      expect(row.status).toBe("funding");
    }));
});

describe("② 오래된 결제 대기 정리", () => {
  // 후원을 2시간 전에 만든 것처럼
  const makeOld = (orderId: string) => db.update(funding).set({ createdAt: sql`now() - interval '2 hours'` }).where(eq(funding.orderId, orderId));
  // 승인 단계에서 결과를 모르는 채 남은 후원 (선점·재고 차감까지 된 상태를 직접 만든다)
  async function stuckInApproval(s: Awaited<ReturnType<typeof setup>>) {
    const order = await pendingFunding(s);
    await db.update(funding).set({ paymentKey: order.paymentKey }).where(eq(funding.orderId, order.orderId));
    await db.execute(sql`update reward set sold_qty = sold_qty + 1 where id = ${s.rewardId}`);
    await makeOld(order.orderId);
    return order;
  }
  const tossSays = (status: string) => (paymentKey: string): TossResult => ({ ok: true, payment: { paymentKey, orderId: paymentKey.replace(/^pk-/, ""), status, totalAmount: 10_000 } });

  it("결제창에서 돌아오지 않은 후원(승인 전) → ABANDONED, 방금 만든 후원은 그대로", async () => {
    const s = await setup(10);
    const old = await pendingFunding(s);
    await makeOld(old.orderId);
    const fresh = await pendingFunding(s);

    const result = await expireStalePendings(db, fakeToss().client, { scope: { projectIds: [s.projectId] } });
    expect(result).toEqual({ abandoned: 1, paid: 0, failed: 0, skipped: 0 });
    expect(await fundingOf(old.orderId)).toMatchObject({ status: "failed", failReason: "ABANDONED" });
    expect((await fundingOf(fresh.orderId)).status).toBe("pending");
  });

  it("승인 단계에 남은 후원 → 토스가 DONE 이면 완료 (재고는 이미 차감됨)", async () => {
    const s = await setup(10);
    const order = await stuckInApproval(s);
    const result = await expireStalePendings(db, fakeToss({ payment: tossSays("DONE") }).client, { scope: { projectIds: [s.projectId] } });
    expect(result).toMatchObject({ paid: 1 });
    expect((await fundingOf(order.orderId)).status).toBe("paid");
    expect(await soldQtyOf(s.rewardId)).toBe(1);
  });

  it("승인 단계에 남은 후원 → 토스가 모르는 결제면 실패 + 재고 되돌리기", async () => {
    const s = await setup(10);
    const order = await stuckInApproval(s);
    const result = await expireStalePendings(db, fakeToss().client, { scope: { projectIds: [s.projectId] } }); // 조회 → NOT_FOUND_PAYMENT
    expect(result).toMatchObject({ failed: 1 });
    expect(await fundingOf(order.orderId)).toMatchObject({ status: "failed", failReason: "EXPIRED_NOT_FOUND_PAYMENT" });
    expect(await soldQtyOf(s.rewardId)).toBe(0);
  });

  it("토스 조회가 안 되면(네트워크) 건드리지 않고 다음 날로 미룬다", async () => {
    const s = await setup(10);
    const order = await stuckInApproval(s);
    const broken = fakeToss({
      payment: () => {
        throw new Error("network");
      },
    });
    expect(await expireStalePendings(db, broken.client, { scope: { projectIds: [s.projectId] } })).toMatchObject({ skipped: 1 });
    expect((await fundingOf(order.orderId)).status).toBe("pending");
  });
});

describe("③ 요청 수 제한 기록 청소", () => {
  it("하루 지난 시간 칸만 지운다", () =>
    withRollback(async (tx) => {
      const key = `cron-test-${Date.now()}`;
      await tx.insert(rateLimit).values([
        { key, windowStart: sql`now() - interval '2 days'`, count: 3 },
        { key, windowStart: sql`date_trunc('minute', now())`, count: 1 },
      ]);
      expect(await cleanupRateLimits(tx)).toBeGreaterThanOrEqual(1);
      const left = await tx.select().from(rateLimit).where(eq(rateLimit.key, key));
      expect(left).toHaveLength(1);
    }));
});
