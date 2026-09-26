"use client";

import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { formatWon } from "@/lib/format";
import { needsShipping, type Step, totalAmount } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import type { FundProject, FundReward } from "./FundFlow";
import styles from "./FundFlow.module.css";

// ③ 확인·결제 (Figma M06). 결제 연결은 11주차 — 이번 주에는 "결제하기" 직전까지
export function ConfirmStep({ project, rewards, onEdit }: { project: FundProject; rewards: FundReward[]; onEdit: (step: Step) => void }) {
  const draft = useFundingStore();
  const reward = rewards.find((r) => r.id === draft.rewardId);
  const total = totalAmount(draft, rewards);
  const shipping = needsShipping(draft, rewards);

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

      <div className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.barAction}>
            <Button fullWidth disabled>
              {formatWon(total)} 결제하기 (11주차에 연결)
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
