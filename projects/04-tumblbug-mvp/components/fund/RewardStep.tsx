"use client";

import { Gift } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatWon } from "@/lib/format";
import { maxQuantity, rewardStepError, totalAmount } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import type { FundReward } from "./FundFlow";
import styles from "./FundFlow.module.css";

// ① 리워드 선택 (Figma M04): 리워드 하나 또는 "리워드 없이" + 수량 + 추가 후원금
export function RewardStep({ rewards, onNext }: { rewards: FundReward[]; onNext: () => void }) {
  const { rewardId, quantity, extraAmount, selectReward, setQuantity, setExtraAmount } = useFundingStore();
  const [error, setError] = useState<string | null>(null);
  const total = totalAmount({ rewardId, quantity, extraAmount }, rewards);

  function next() {
    const problem = rewardStepError(useFundingStore.getState(), rewards);
    setError(problem);
    if (!problem) onNext();
  }

  return (
    <section className={styles.step} aria-labelledby="reward-step-title">
      <h1 id="reward-step-title" className="text-heading-m">
        리워드를 골라 주세요
      </h1>
      <fieldset className={styles.options}>
        <legend className="sr-only">리워드</legend>
        {rewards.map((r) => {
          const max = maxQuantity(r);
          const soldOut = max === 0;
          const selected = rewardId === r.id;
          const [year, month] = r.deliveryMonth.split("-");
          return (
            <label key={r.id} className={styles.option}>
              <input type="radio" name="reward" className={styles.radio} checked={selected} disabled={soldOut} onChange={() => selectReward(r.id)} />
              <span className={styles.optionTop}>
                <span className="text-heading-m">{formatWon(r.price)}</span>
                <span className="text-caption text-muted">{soldOut ? "품절" : r.limitQty === null ? "무제한" : `${r.limitQty - r.soldQty}개 남음`}</span>
              </span>
              <span className="text-body-m-strong">{r.title}</span>
              {r.description && <span className="text-body-s text-muted">{r.description}</span>}
              <span className="text-caption text-muted">
                {year}년 {Number(month)}월 전달 예정{r.needsShipping ? "" : " · 배송 없음"}
              </span>
              {selected && (
                // 라벨 안의 버튼을 눌러도 라디오가 다시 선택되지 않게 클릭을 여기서 멈춘다
                <span className={styles.quantity} onClick={(e) => e.preventDefault()}>
                  <span className="text-label">수량</span>
                  <QuantityStepper label={`${r.title} 수량`} value={quantity} max={max} onChange={setQuantity} />
                </span>
              )}
            </label>
          );
        })}
        <label className={styles.option}>
          <input type="radio" name="reward" className={styles.radio} checked={rewardId === null} onChange={() => selectReward(null)} />
          <span className={styles.optionTop}>
            <span className="text-body-m-strong" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Gift size={20} aria-hidden="true" /> 리워드 없이 후원하기
            </span>
          </span>
          <span className="text-caption text-muted">선물 없이 응원만 보내요 (1,000원 이상)</span>
        </label>
      </fieldset>

      <Field
        label={rewardId === null ? "후원 금액 (원)" : "추가 후원금 (원, 선택)"}
        inputMode="numeric"
        value={extraAmount === 0 ? "" : extraAmount.toLocaleString("ko-KR")}
        placeholder="0"
        onChange={(e) => setExtraAmount(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        helper={rewardId === null ? "1,000원 ~ 1,000,000원" : "리워드 금액에 더해져요"}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.bar}>
        <div className={styles.barInner}>
          <p className={styles.barTotal}>
            <span className="text-caption text-muted">총 후원 금액</span>
            <span className="text-heading-m" data-testid="total">
              {formatWon(total)}
            </span>
          </p>
          <div className={styles.barAction}>
            <Button fullWidth onClick={next}>
              다음
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
