import { and, eq, isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, paymentEvent } from "@/db/schema";
import type { TossPayment } from "@/lib/payments/toss";
import { returnRewardStock } from "@/lib/reward-stock";

// 결제 결과를 DB에 반영한다 — 결제 승인(confirm.ts)과 웹훅(3단계)이 함께 쓴다.
// 두 경우 모두 "여러 줄을 한 번에" 바꿔야 해서 트랜잭션을 쓴다 (PLAN 결정 사항)
// 그리고 "아직 결제 대기(pending)인 것만" 바꾼다 → 같은 결과가 두 번 들어와도 두 번째는 아무것도 바꾸지 않는다 (멱등성)

type Target = { id: number; orderId: string; rewardId: number | null; quantity: number };

// 성공 = 후원 완료 + 결제 기록을 한 번에
export async function markPaid(db: Db, target: Target, payment: TossPayment): Promise<boolean> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(funding)
      .set({ status: "paid", paymentKey: payment.paymentKey, paidAt: new Date(), failReason: null })
      .where(and(eq(funding.id, target.id), eq(funding.status, "pending")))
      .returning({ id: funding.id });
    if (updated.length === 0) return false; // 이미 처리됨 (다른 요청·웹훅이 먼저 끝냈다)
    // 결제 기록: 토스가 돌려준 승인 결과를 그대로 남긴다 (나중에 "정말 승인됐나?"를 확인할 근거)
    await tx
      .insert(paymentEvent)
      .values({ eventId: `confirm:${payment.paymentKey}`, orderId: target.orderId, status: payment.status, payload: payment })
      .onConflictDoNothing();
    return true;
  });
}

// 실패 = 후원 실패 + 차감했던 수량 되돌리기를 한 번에.
// 재고를 차감한 후원만 되돌린다 — 승인 단계에 들어간(payment_key 가 있는) 결제 대기 후원 (confirm.ts 의 "선점" 참고)
export async function markFailed(db: Db, target: Target, reason: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(funding)
      .set({ status: "failed", failReason: reason.slice(0, 100) })
      .where(and(eq(funding.id, target.id), eq(funding.status, "pending"), isNotNull(funding.paymentKey)))
      .returning({ id: funding.id });
    if (updated.length === 0) return false;
    if (target.rewardId !== null) await returnRewardStock(tx, target.rewardId, target.quantity);
    return true;
  });
}
