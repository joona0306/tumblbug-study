import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { FundResult } from "@/components/fund/FundResult";
import { db } from "@/db";
import { funding } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "결제 실패 — 모아" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ code?: string; message?: string; orderId?: string }> };

// 결제창에서 결제가 실패·취소되면 토스가 이 주소로 보낸다.
// 예: /projects/3/fund/fail?code=PAY_PROCESS_CANCELED&message=사용자에 의해 결제가 취소되었습니다&orderId=...
export default async function FundFailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { code, message, orderId } = await searchParams;
  const me = await requireUser(`/projects/${id}`);

  // 결제 대기였던 "내" 후원을 실패로 기록한다 (승인 단계에 들어가지 않은 것만 — payment_key 없음)
  if (orderId) {
    await db
      .update(funding)
      .set({ status: "failed", failReason: String(code ?? "UNKNOWN").slice(0, 100) })
      .where(and(eq(funding.orderId, orderId), eq(funding.supporterId, me.id), eq(funding.status, "pending"), isNull(funding.paymentKey)));
  }

  const canceled = code === "PAY_PROCESS_CANCELED";
  return (
    <FundResult
      tone="error"
      title={canceled ? "결제를 취소했어요" : "결제하지 못했어요"}
      // 고른 내용은 그대로 남아 있으니(Zustand persist) 확인 화면으로 바로 돌아가 다시 시도할 수 있다
      primary={{ href: `/projects/${id}/fund?step=3`, label: "다시 결제하기" }}
      secondary={{ href: `/projects/${id}`, label: "프로젝트로 돌아가기" }}
    >
      <p>{canceled ? "돈은 나가지 않았어요. 고른 내용은 그대로 남아 있어요." : (message ?? "잠시 후 다시 시도해 주세요.")}</p>
      {code && !canceled && <p className="text-caption">오류 코드: {code}</p>}
    </FundResult>
  );
}
