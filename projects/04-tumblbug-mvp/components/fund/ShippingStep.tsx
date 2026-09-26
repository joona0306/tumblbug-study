"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { shippingStepError } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import styles from "./FundFlow.module.css";

// ② 배송지 (Figma M05). 입력하는 대로 스토어에 저장 → 뒤로 갔다 와도, 새로고침해도 그대로
export function ShippingStep({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const { shipping, setShipping } = useFundingStore();
  const [error, setError] = useState<string | null>(null);

  function next() {
    const problem = shippingStepError(useFundingStore.getState());
    setError(problem);
    if (!problem) onNext();
  }

  return (
    <section className={styles.step} aria-labelledby="shipping-step-title">
      <h1 id="shipping-step-title" className="text-heading-m">
        리워드를 받을 곳
      </h1>
      <Field label="받는 분" autoComplete="name" value={shipping.recipientName} onChange={(e) => setShipping({ recipientName: e.target.value })} />
      <Field
        label="연락처"
        type="tel"
        autoComplete="tel"
        placeholder="010-1234-5678"
        value={shipping.recipientPhone}
        onChange={(e) => setShipping({ recipientPhone: e.target.value })}
        helper="배송 문의가 있을 때만 쓰여요"
      />
      <Field label="주소" autoComplete="street-address" value={shipping.address} onChange={(e) => setShipping({ address: e.target.value })} helper="동·호수까지 적어 주세요" />
      <p className={styles.notice}>배송지는 결제가 끝난 뒤, 이 프로젝트의 창작자에게만 보여요.</p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.bar}>
        <div className={styles.barInner}>
          <Button variant="secondary" onClick={onPrev}>
            이전
          </Button>
          <div className={styles.barAction}>
            <Button fullWidth onClick={next}>
              다음: 확인
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
