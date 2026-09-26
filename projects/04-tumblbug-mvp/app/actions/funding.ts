"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { funding, project } from "@/db/schema";
import { quoteFunding } from "@/lib/funding/quote";
import { getCurrentUser } from "@/lib/session";
import { fundingDraftSchema } from "@/lib/validation/funding";

export type StartResult =
  | { ok: true; orderId: string; orderName: string; amount: number; customerName: string }
  | { ok: false; error: string; step: 1 | 2 | null };

// 확인 화면의 "결제하기" → 결제창을 열기 "직전"에 부른다 (2단계 커피 후원과 같은 흐름).
// 1) 서버가 후원서를 다시 검사하고 총액을 계산한다 (10주차 quoteFunding)
// 2) 결제 대기(pending) 후원을 만들어 "서버가 계산한 금액"을 적어 둔다 → 결제가 끝나고 돌아오면 이 금액과 비교한다
export async function startFunding(input: unknown): Promise<StartResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요. 다시 로그인해 주세요", step: null };

  const parsed = fundingDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "후원 내용이 올바르지 않아요. 처음부터 다시 골라 주세요", step: 1 };
  const draft = parsed.data;

  const quote = await quoteFunding(db, me.id, draft);
  if (!quote.ok) return quote;

  // 주문 번호: 겹칠 일이 사실상 없는 무작위 문자열 (토스 규칙: 6~64자, 영문·숫자·-·_)
  const orderId = crypto.randomUUID();
  await db.insert(funding).values({
    projectId: draft.projectId,
    supporterId: me.id,
    rewardId: quote.rewardId,
    quantity: quote.quantity,
    extraAmount: draft.extraAmount,
    amount: quote.amount,
    message: draft.message,
    // 배송이 필요한 리워드일 때만 배송지를 저장한다 (필요 없는 개인정보는 받지도 두지도 않는다)
    ...(quote.needsShipping ? draft.shipping : {}),
    orderId,
  });

  const [p] = await db.select({ title: project.title }).from(project).where(eq(project.id, draft.projectId));
  return { ok: true, orderId, orderName: `${p.title} 후원`.slice(0, 100), amount: quote.amount, customerName: me.name };
}

// 결제창을 닫았거나(취소) 결제를 시작하지 못했을 때 → 결제 대기였던 "내" 후원을 실패로 기록한다.
// 아직 승인 단계에 들어가지 않은 것(payment_key 없음)만 바꾼다 — 이미 승인 중·완료인 후원은 건드리지 않는다
export async function cancelFunding(orderId: string, reason: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await db
    .update(funding)
    .set({ status: "failed", failReason: reason.slice(0, 100) })
    .where(and(eq(funding.orderId, orderId), eq(funding.supporterId, me.id), eq(funding.status, "pending"), isNull(funding.paymentKey)));
}
