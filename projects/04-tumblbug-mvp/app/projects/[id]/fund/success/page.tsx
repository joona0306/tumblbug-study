import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClearDraft } from "@/components/fund/ClearDraft";
import { FundResult } from "@/components/fund/FundResult";
import { db } from "@/db";
import { formatWon } from "@/lib/format";
import { confirmFunding } from "@/lib/funding/confirm";
import { recordFunnelStep, VISITOR_COOKIE } from "@/lib/funnel";
import { tossClient } from "@/lib/payments/toss";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "결제 결과 — 모아" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }> };

// 결제창에서 결제가 끝나면 토스가 이 주소로 보낸다.
// 예: /projects/3/fund/success?paymentKey=...&orderId=...&amount=36000
// 아직 "결제 승인" 전이다 — 여기서 서버가 확인하고 승인해야 결제가 최종 완료된다 (lib/funding/confirm.ts)
export default async function FundSuccessPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { paymentKey, orderId, amount } = await searchParams;
  const me = await requireUser(`/projects/${id}`);
  const project = { href: `/projects/${id}`, label: "프로젝트로 돌아가기" };

  if (!paymentKey || !orderId || !amount) {
    return (
      <FundResult tone="error" title="결제 정보가 없어요" primary={project}>
        <p>결제창을 통해 다시 후원해 주세요.</p>
      </FundResult>
    );
  }

  const result = await confirmFunding(db, tossClient, { paymentKey, orderId, amount: Number(amount), supporterId: me.id });

  // 퍼널: 결제 완료 (15주차) — 서버가 승인을 확인한 뒤에만 기록한다 (새로고침해도 한 번)
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (result.status === "paid" && visitorId) await recordFunnelStep(db, visitorId, Number(id), "paid");

  switch (result.status) {
    case "paid":
      return (
        <FundResult tone="success" title="후원해 주셔서 고마워요!" primary={{ href: "/me/fundings", label: "내 후원 내역 보기" }} secondary={project}>
          <ClearDraft />
          <p>
            <strong className="text-heading-m" style={{ color: "var(--color-text)" }}>
              {formatWon(result.amount)}
            </strong>{" "}
            후원이 완료됐어요.
          </p>
          <p className="text-caption">테스트 결제라 실제로 돈이 나가지 않았어요.</p>
        </FundResult>
      );
    case "processing":
      // 결과를 아직 모름 → 잠시 뒤 웹훅이 결제 상태를 맞춘다. 다시 결제하면 두 번 결제될 수 있으니 권하지 않는다
      return (
        <FundResult tone="error" title="결제를 확인하고 있어요" primary={{ href: "/me/fundings", label: "내 후원 내역에서 확인하기" }} secondary={project}>
          <p>잠시 후 내 후원 내역에서 결과를 확인해 주세요. 다시 결제하지 않아도 돼요.</p>
        </FundResult>
      );
    case "failed":
      return (
        <FundResult tone="error" title="결제하지 못했어요" primary={{ href: `/projects/${id}/fund?step=1`, label: "다시 후원하기" }} secondary={project}>
          <p>{result.message}</p>
          <p className="text-caption">오류 코드: {result.reason}</p>
        </FundResult>
      );
    case "not_found":
      return (
        <FundResult tone="error" title="주문을 찾을 수 없어요" primary={project}>
          <p>결제 정보가 올바르지 않아요.</p>
        </FundResult>
      );
  }
}
