"use client";

import { useState, useTransition } from "react";
import { checkFunding } from "@/app/actions/funding";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { formatWon } from "@/lib/format";
import type { Quote } from "@/lib/funding/quote";
import { needsShipping, type Step, totalAmount } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import type { FundProject, FundReward } from "./FundFlow";
import styles from "./FundFlow.module.css";

// ③ 확인·결제 (Figma M06). 결제 연결은 11주차 — 이번 주에는 "결제하기"를 누르면 서버 검사까지
export function ConfirmStep({ project, rewards, onEdit }: { project: FundProject; rewards: FundReward[]; onEdit: (step: Step) => void }) {
  const draft = useFundingStore();
  const reward = rewards.find((r) => r.id === draft.rewardId);
  const total = totalAmount(draft, rewards);
  const shipping = needsShipping(draft, rewards);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, startTransition] = useTransition();

  // 서버에는 "고른 것"만 보낸다 (총액은 보내지 않는다 — 서버가 다시 계산)
  function pay() {
    const { projectId, rewardId, quantity, extraAmount, shipping, message } = useFundingStore.getState();
    startTransition(async () => {
      setQuote(await checkFunding({ projectId, rewardId, quantity, extraAmount, shipping, message }));
    });
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
      <p className={styles.notice}>
        테스트 결제예요 — 실제로 돈이 나가지 않아요.
        <br />
        후원 즉시 결제되며, 목표를 못 채워도 자동 환불되지 않아요 (MVP 한계).
      </p>

      {quote?.ok && (
        <p role="status" className={styles.ok}>
          서버 확인 완료: {formatWon(quote.amount)} — 결제창 연결은 11주차에 해요.
        </p>
      )}
      {quote && !quote.ok && (
        <div role="alert" className={styles.error}>
          <p>{quote.error}</p>
          {quote.step && (
            <Button variant="ghost" size="m" onClick={() => onEdit(quote.step!)}>
              {quote.step}단계로 돌아가 고치기
            </Button>
          )}
        </div>
      )}

      <div className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.barAction}>
            <Button fullWidth onClick={pay} disabled={pending}>
              {pending ? "확인하는 중…" : `${formatWon(total)} 결제하기`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
