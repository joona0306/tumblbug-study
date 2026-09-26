import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { funding } from "@/db/schema";
import { confirmFunding } from "@/lib/funding/confirm";
import { handleTossWebhook, type TossWebhook } from "@/lib/funding/webhook";
import type { TossResult } from "@/lib/payments/toss";
import { cleanup, db, eventsOf, fakeToss, fundingOf, pendingFunding, pool, setup, soldQtyOf } from "./payment-helpers";

// 웹훅 테스트: 결제창에서 돌아오지 못한 결제를 웹훅이 마무리하는지, 같은 알림·가짜 알림에 안전한지
afterEach(cleanup);
afterAll(() => pool.end());

const webhook = (order: { orderId: string; paymentKey: string }, status: string): TossWebhook => ({
  eventType: "PAYMENT_STATUS_CHANGED",
  createdAt: "2026-09-26T20:00:00.000000",
  data: { paymentKey: order.paymentKey, orderId: order.orderId, status },
});

// 토스 결제 조회가 돌려줄 "진짜" 상태
const tossSays =
  (status: string, orderId?: string) =>
  (paymentKey: string): TossResult => ({ ok: true, payment: { paymentKey, orderId: orderId ?? paymentKey.replace(/^pk-/, ""), status, totalAmount: 10_000 } });

// 결제창에서 승인 응답을 못 받은 상태 만들기 (선점·차감까지 끝나고 결과를 모름)
async function processingFunding(limitQty: number | null) {
  const s = await setup(limitQty);
  const order = await pendingFunding(s);
  const toss = fakeToss({
    confirm: () => {
      throw new Error("timeout");
    },
  });
  expect(await confirmFunding(db, toss.client, order)).toEqual({ status: "processing" });
  return { s, order };
}

describe("토스 웹훅 handleTossWebhook", () => {
  it("승인 응답을 못 받은 결제 → 토스 조회가 DONE 이면 후원 완료", async () => {
    const { s, order } = await processingFunding(10);
    const toss = fakeToss({ payment: tossSays("DONE") });

    expect(await handleTossWebhook(db, toss.client, webhook(order, "DONE"))).toBe("applied");
    expect((await fundingOf(order.orderId)).status).toBe("paid");
    expect(await soldQtyOf(s.rewardId)).toBe(1); // 차감은 승인 단계에서 이미 했다 (두 번 줄이지 않는다)
  });

  it("승인 응답을 못 받은 결제 → 토스 조회가 ABORTED 면 후원 실패 + 재고 되돌리기", async () => {
    const { s, order } = await processingFunding(10);
    const toss = fakeToss({ payment: tossSays("ABORTED") });

    expect(await handleTossWebhook(db, toss.client, webhook(order, "ABORTED"))).toBe("applied");
    const f = await fundingOf(order.orderId);
    expect(f.status).toBe("failed");
    expect(f.failReason).toBe("WEBHOOK_ABORTED");
    expect(await soldQtyOf(s.rewardId)).toBe(0);
  });

  it("같은 알림이 여러 번 와도 한 번만 처리한다 (멱등성)", async () => {
    const { s, order } = await processingFunding(10);
    const toss = fakeToss({ payment: tossSays("ABORTED") });
    const event = webhook(order, "ABORTED");

    expect(await handleTossWebhook(db, toss.client, event)).toBe("applied");
    expect(await handleTossWebhook(db, toss.client, event)).toBe("duplicate");
    expect(await soldQtyOf(s.rewardId)).toBe(0); // 두 번 되돌려 -1 이 되지 않았다
    expect((await eventsOf(order.orderId)).filter((e) => e.eventId.startsWith("PAYMENT_STATUS_CHANGED"))).toHaveLength(1);
  });

  it("알림 내용을 믿지 않는다: 가짜로 DONE 이라고 보내도, 토스 조회가 없는 결제면 무시", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss(); // 조회하면 "존재하지 않는 결제"

    expect(await handleTossWebhook(db, toss.client, webhook(order, "DONE"))).toBe("ignored");
    expect((await fundingOf(order.orderId)).status).toBe("pending");
  });

  it("알림의 주문 번호가 토스 조회 결과와 다르면 무시 (다른 결제 키를 끼워 넣은 경우)", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss({ payment: tossSays("DONE", "someone-elses-order") });

    expect(await handleTossWebhook(db, toss.client, webhook(order, "DONE"))).toBe("ignored");
    expect((await fundingOf(order.orderId)).status).toBe("pending");
  });

  it("결제창을 열고 그냥 떠난 후원(승인 전) → EXPIRED 알림이면 실패로 (재고는 건드리지 않음)", async () => {
    const s = await setup(10, 3);
    const order = await pendingFunding(s);
    const toss = fakeToss({ payment: tossSays("EXPIRED") });

    expect(await handleTossWebhook(db, toss.client, webhook(order, "EXPIRED"))).toBe("applied");
    expect((await fundingOf(order.orderId)).failReason).toBe("WEBHOOK_EXPIRED");
    expect(await soldQtyOf(s.rewardId)).toBe(3);
  });

  it("이미 끝난 후원은 바꾸지 않는다 (결제 완료 후 취소·환불은 범위 밖)", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    await confirmFunding(db, fakeToss().client, order);
    const toss = fakeToss({ payment: tossSays("CANCELED") });

    expect(await handleTossWebhook(db, toss.client, webhook(order, "CANCELED"))).toBe("applied");
    expect((await fundingOf(order.orderId)).status).toBe("paid");
  });

  it("토스 조회가 실패(네트워크)하면 에러를 던진다 → 500 → 토스가 다시 보낸다. 기록도 남기지 않는다", async () => {
    const { order } = await processingFunding(10);
    const broken = fakeToss({
      payment: () => {
        throw new Error("network");
      },
    });
    await expect(handleTossWebhook(db, broken.client, webhook(order, "DONE"))).rejects.toThrow("network");

    // 다시 온 알림은 "처음 온 알림"처럼 처리된다
    expect(await handleTossWebhook(db, fakeToss({ payment: tossSays("DONE") }).client, webhook(order, "DONE"))).toBe("applied");
    expect((await db.select({ status: funding.status }).from(funding).where(eq(funding.orderId, order.orderId)))[0].status).toBe("paid");
  });
});
