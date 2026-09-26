import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { funding, paymentEvent } from "@/db/schema";
import type { TossClient } from "@/lib/payments/toss";
import { markFailed, markPaid } from "./settle";

// 토스 웹훅 "결제 상태 변경(PAYMENT_STATUS_CHANGED)" 알림의 모양 (쓰는 값만 검사하고 나머지는 그대로 둔다)
export const tossWebhookSchema = z.object({
  eventType: z.string(),
  createdAt: z.string(),
  data: z.looseObject({ paymentKey: z.string(), orderId: z.string(), status: z.string() }),
});
export type TossWebhook = z.infer<typeof tossWebhookSchema>;

export type WebhookResult = "applied" | "duplicate" | "ignored";

const FAILED_STATUSES = new Set(["CANCELED", "ABORTED", "EXPIRED"]);

// 웹훅 처리. 결제창에서 돌아오지 못한 결제(브라우저를 닫음, 승인 응답 시간 초과 등)를 여기서 마무리한다.
//  ① 같은 알림을 이미 처리했으면 건너뛴다 (토스는 200 응답을 못 받으면 최대 7번 다시 보낸다)
//  ② 알림 내용을 믿지 않고 토스 "결제 조회"로 진짜 상태를 확인한다 — 일반 결제 웹훅에는 서명이 없어서 누구나 가짜 알림을 보낼 수 있다
//  ③ 결과 반영 (settle.ts: 결제 대기인 것만 바꾼다 → 여러 번 반영해도 결과가 같다)
//  ④ 처리가 끝난 "다음에" 알림을 기록한다 — 먼저 기록하면, 처리 중 에러가 났을 때 다시 온 알림을 "처리했음"으로 착각해 버린다
// 에러는 던진다 → 라우트가 500으로 응답 → 토스가 나중에 다시 보낸다
export async function handleTossWebhook(db: Db, toss: TossClient, event: TossWebhook): Promise<WebhookResult> {
  if (event.eventType !== "PAYMENT_STATUS_CHANGED") return "ignored";
  const { paymentKey, orderId } = event.data;
  // 알림의 고유값: 다시 보낸 알림은 내용(시각 포함)이 같으므로 같은 값이 된다
  const eventId = `${event.eventType}:${paymentKey}:${event.data.status}:${event.createdAt}`;

  // ①
  const [seen] = await db.select({ id: paymentEvent.id }).from(paymentEvent).where(eq(paymentEvent.eventId, eventId));
  if (seen) return "duplicate";

  // ② 토스가 모르는 결제거나, 알림의 주문 번호와 다르면 가짜 → 무시 (200으로 답해 다시 보내지 않게 한다)
  const verified = await toss.getPayment(paymentKey);
  if (!verified.ok || verified.payment.orderId !== orderId) return "ignored";
  const payment = verified.payment;

  const [f] = await db
    .select({ id: funding.id, orderId: funding.orderId, rewardId: funding.rewardId, quantity: funding.quantity, status: funding.status, paymentKey: funding.paymentKey })
    .from(funding)
    .where(eq(funding.orderId, orderId));
  if (!f) return "ignored";

  // ③ 결제 대기인 후원만 바꾼다. 이미 끝난(paid·failed) 후원은 그대로 — 결제 완료 후 취소(환불)는 이 MVP의 범위 밖
  if (f.status === "pending") {
    if (payment.status === "DONE") {
      await markPaid(db, f, payment);
    } else if (FAILED_STATUSES.has(payment.status)) {
      if (f.paymentKey !== null) {
        await markFailed(db, f, `WEBHOOK_${payment.status}`); // 승인 단계에 들어갔던 후원 → 차감한 재고도 되돌린다
      } else {
        await db
          .update(funding)
          .set({ status: "failed", failReason: `WEBHOOK_${payment.status}` })
          .where(and(eq(funding.id, f.id), eq(funding.status, "pending"), isNull(funding.paymentKey)));
      }
    }
  }

  // ④ 알림 기록 (동시에 두 번 와서 둘 다 여기까지 왔다면 하나만 남는다 — UNIQUE)
  await db.insert(paymentEvent).values({ eventId, orderId, status: payment.status, payload: event }).onConflictDoNothing();
  return "applied";
}
