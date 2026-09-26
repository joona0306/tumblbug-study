import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { funding } from "@/db/schema";
import type { TossClient, TossResult } from "@/lib/payments/toss";
import { takeRewardStock } from "@/lib/reward-stock";
import { markFailed, markPaid } from "./settle";

export type ConfirmResult =
  | { status: "paid"; fundingId: number; amount: number }
  | { status: "failed"; reason: string; message: string }
  | { status: "processing" } // 결과를 아직 모름 (다른 요청이 처리 중이거나 토스 응답이 없었다) → 웹훅이 마무리한다
  | { status: "not_found" };

const MESSAGES: Record<string, string> = {
  SOLD_OUT: "그 사이에 리워드가 품절됐어요. 결제는 승인하지 않았어요 (돈이 나가지 않아요).",
  AMOUNT_MISMATCH: "결제 금액이 올바르지 않아 결제를 승인하지 않았어요.",
};
const messageOf = (reason: string, fallback?: string) => MESSAGES[reason] ?? fallback ?? "결제를 승인하지 못했어요.";

// 결제창에서 돌아온 뒤(성공 주소) 결제를 최종 승인한다. 순서가 핵심이다:
//  ① 금액 비교 → ② [트랜잭션] 주문 선점 + 재고 조건부 차감 → ③ 토스 승인 (트랜잭션 밖) → ④ [트랜잭션] 결과 반영
// 토스 승인(외부 API, 느릴 수 있음)을 트랜잭션 안에 넣지 않는 이유: 그동안 DB 줄이 잠겨 다른 후원이 모두 기다리게 된다 (ADR-003)
export async function confirmFunding(
  db: Db,
  toss: TossClient,
  input: { orderId: string; paymentKey: string; amount: number; supporterId: string },
): Promise<ConfirmResult> {
  const [f] = await db
    .select({ id: funding.id, orderId: funding.orderId, rewardId: funding.rewardId, quantity: funding.quantity, amount: funding.amount, status: funding.status, paymentKey: funding.paymentKey, failReason: funding.failReason })
    .from(funding)
    .where(and(eq(funding.orderId, input.orderId), eq(funding.supporterId, input.supporterId)));
  if (!f) return { status: "not_found" };

  // 새로고침 등으로 다시 들어온 경우: 이미 끝난 후원이면 결과만 돌려준다 (토스를 다시 부르지 않는다)
  if (f.status === "paid") return { status: "paid", fundingId: f.id, amount: f.amount };
  if (f.status === "failed") return { status: "failed", reason: f.failReason ?? "UNKNOWN", message: messageOf(f.failReason ?? "") };
  if (f.paymentKey !== null) return { status: "processing" }; // 다른 요청이 이미 승인 중

  // ① 주소에 담겨 온 금액 = 서버가 기록한 금액? (결제위젯 금액을 조작했다면 여기서 걸린다 — 승인하지 않으면 돈이 나가지 않는다)
  if (input.amount !== f.amount) {
    await db
      .update(funding)
      .set({ status: "failed", failReason: "AMOUNT_MISMATCH" })
      .where(and(eq(funding.id, f.id), eq(funding.status, "pending"), isNull(funding.paymentKey)));
    return { status: "failed", reason: "AMOUNT_MISMATCH", message: messageOf("AMOUNT_MISMATCH") };
  }

  // ② 주문 선점 + 재고 차감을 한 트랜잭션으로.
  //  - 선점: payment_key 를 "비어 있을 때만" 채운다 → 같은 주문으로 두 요청이 동시에 와도 한 요청만 다음으로 간다
  //  - 차감: 남아 있을 때만 줄인다 (6주차 조건부 차감). 품절이면 토스를 부르지 않고 바로 실패
  //  - 둘을 묶어 두면 "선점했는데 차감은 안 된" 어중간한 상태가 생기지 않는다 → 되돌릴 때 헷갈리지 않는다
  const claim = await db.transaction(async (tx) => {
    const claimed = await tx
      .update(funding)
      .set({ paymentKey: input.paymentKey })
      .where(and(eq(funding.id, f.id), eq(funding.status, "pending"), isNull(funding.paymentKey)))
      .returning({ id: funding.id });
    if (claimed.length === 0) return "taken" as const;
    if (f.rewardId !== null && !(await takeRewardStock(tx, f.rewardId, f.quantity))) {
      await tx.update(funding).set({ status: "failed", failReason: "SOLD_OUT" }).where(eq(funding.id, f.id));
      return "sold_out" as const;
    }
    return "claimed" as const;
  });
  if (claim === "taken") return { status: "processing" };
  if (claim === "sold_out") return { status: "failed", reason: "SOLD_OUT", message: messageOf("SOLD_OUT") };

  // ③ 토스 승인 — 금액은 브라우저가 아닌 "우리 DB의 금액"을 보낸다
  let result: TossResult;
  try {
    result = await toss.confirm({ paymentKey: input.paymentKey, orderId: f.orderId, amount: f.amount });
  } catch {
    // 응답을 못 받음(시간 초과 등): 승인됐는지 안 됐는지 모른다 → 그대로 두고 웹훅·조회로 마무리한다
    return { status: "processing" };
  }

  // ④ 결과 반영 (settle.ts 의 트랜잭션)
  if (result.ok) {
    await markPaid(db, f, result.payment);
    return { status: "paid", fundingId: f.id, amount: f.amount };
  }
  await markFailed(db, f, result.code);
  return { status: "failed", reason: result.code, message: messageOf(result.code, result.message) };
}
