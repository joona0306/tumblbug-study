"use client";

import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { useEffect, useState } from "react";
import { cancelFunding, type StartResult, startFunding } from "@/app/actions/funding";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { formatWon } from "@/lib/format";
import { needsShipping, type Step, totalAmount } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import type { FundProject, FundReward } from "./FundFlow";
import styles from "./FundFlow.module.css";

type Failure = Extract<StartResult, { ok: false }>;

// ③ 확인·결제 (Figma M06). 토스페이먼츠 결제위젯(테스트 모드)으로 결제한다
export function ConfirmStep({
  project,
  rewards,
  onEdit,
  tossClientKey,
}: {
  project: FundProject;
  rewards: FundReward[];
  onEdit: (step: Step) => void;
  tossClientKey: string | null;
}) {
  const draft = useFundingStore();
  const reward = rewards.find((r) => r.id === draft.rewardId);
  const total = totalAmount(draft, rewards);
  const shipping = needsShipping(draft, rewards);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false); // 결제수단·약관 화면이 다 그려졌는지
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  // 1. 처음 한 번: 토스 SDK를 불러와 결제위젯 도구를 만든다 (키가 없으면 결제를 끈다)
  useEffect(() => {
    if (!tossClientKey) return;
    let cancelled = false;
    loadTossPayments(tossClientKey).then((toss) => {
      if (!cancelled) setWidgets(toss.widgets({ customerKey: ANONYMOUS }));
    });
    return () => {
      cancelled = true;
    };
  }, [tossClientKey]);

  // 2. 도구가 준비되면: 금액을 정하고 결제수단·약관을 그린다
  useEffect(() => {
    if (!widgets) return;
    (async () => {
      await widgets.setAmount({ currency: "KRW", value: totalAmount(useFundingStore.getState(), rewards) });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
        widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
      ]);
      setReady(true);
    })();
  }, [widgets, rewards]);

  // 3. "결제하기": 서버가 검사·금액 기록(결제 대기 후원 만들기) → 서버가 계산한 금액으로 결제창을 연다
  async function pay() {
    if (!widgets) return;
    setFailure(null);
    setPending(true);
    const { projectId, rewardId, quantity, extraAmount, shipping, message } = useFundingStore.getState();
    // 서버에는 "고른 것"만 보낸다 (총액은 보내지 않는다 — 서버가 다시 계산)
    const order = await startFunding({ projectId, rewardId, quantity, extraAmount, shipping, message });
    if (!order.ok) {
      setFailure(order);
      setPending(false);
      return;
    }

    try {
      await widgets.setAmount({ currency: "KRW", value: order.amount });
      // 결제가 끝나면 토스가 successUrl(성공) 또는 failUrl(실패)로 이동시킨다
      const base = `${window.location.origin}/projects/${project.id}/fund`;
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        customerName: order.customerName,
        successUrl: `${base}/success`,
        failUrl: `${base}/fail`,
      });
    } catch (e) {
      // 결제창을 닫았거나, 약관에 동의하지 않은 경우 등 → 만들어 둔 후원을 "실패"로 기록 (어디서 포기했는지 보기 위해)
      const error = e as { code?: string; message?: string };
      await cancelFunding(order.orderId, error.code ?? "CLIENT_ERROR");
      setFailure({ ok: false, error: error.message ?? "결제를 시작하지 못했어요. 다시 시도해 주세요", step: null });
      setPending(false);
    }
  }

  return (
    <section className={styles.step} aria-labelledby="confirm-step-title">
      <h1 id="confirm-step-title" className="text-heading-m">
        후원 내용을 확인해 주세요
      </h1>
      <div role="group" className={styles.box} aria-label="후원 내용">
        <p className="text-label text-muted">{project.title}</p>
        {reward && (
          <p className={styles.line}>
            <span>
              {reward.title} × {draft.quantity}
            </span>
            <span>{formatWon(reward.price * draft.quantity)}</span>
          </p>
        )}
        {(!reward || draft.extraAmount > 0) && (
          <p className={styles.line}>
            <span>{reward ? "추가 후원금" : "후원 금액"}</span>
            <span>{formatWon(draft.extraAmount)}</span>
          </p>
        )}
        <p className={styles.total}>
          <span className="text-body-m-strong">총 결제 금액</span>
          <span className="text-heading-l" style={{ color: "var(--color-primary)" }}>
            {formatWon(total)}
          </span>
        </p>
        <Button variant="ghost" size="m" onClick={() => onEdit(1)}>
          리워드 바꾸기
        </Button>
      </div>

      {shipping && (
        <div role="group" className={styles.box} aria-label="배송지">
          <p className="text-label text-muted">배송지</p>
          <p className="text-body-m-strong">
            {draft.shipping.recipientName} · {draft.shipping.recipientPhone}
          </p>
          <p className="text-body-s">{draft.shipping.address}</p>
          <Button variant="ghost" size="m" onClick={() => onEdit(2)}>
            배송지 바꾸기
          </Button>
        </div>
      )}

      <TextAreaField
        label="응원 메시지 (선택)"
        rows={3}
        maxLength={200}
        value={draft.message}
        onChange={(e) => draft.setMessage(e.target.value)}
        helper="창작자 대시보드에 보여요 · 최대 200자"
      />

      {/* 토스페이먼츠 결제위젯이 이 두 칸 안에 그려진다 */}
      {tossClientKey ? (
        <div className={styles.widget}>
          <div id="payment-method" />
          <div id="agreement" />
        </div>
      ) : (
        <p className={styles.notice}>결제 키(NEXT_PUBLIC_TOSS_CLIENT_KEY)가 없어 결제할 수 없어요. .env.local 을 확인해 주세요.</p>
      )}
      <p className={styles.notice}>
        테스트 결제예요 — 실제로 돈이 나가지 않아요.
        <br />
        후원 즉시 결제되며, 목표를 못 채워도 자동 환불되지 않아요 (MVP 한계).
      </p>

      {failure && (
        <div role="alert" className={styles.error}>
          <p>{failure.error}</p>
          {failure.step && (
            <Button variant="ghost" size="m" onClick={() => onEdit(failure.step!)}>
              {failure.step}단계로 돌아가 고치기
            </Button>
          )}
        </div>
      )}

      <div className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.barAction}>
            <Button fullWidth onClick={pay} disabled={!ready || pending}>
              {!tossClientKey ? "결제 준비 안 됨" : !ready ? "결제 준비 중…" : pending ? "결제창 여는 중…" : `${formatWon(total)} 결제하기`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
