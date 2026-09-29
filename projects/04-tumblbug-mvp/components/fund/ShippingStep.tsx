"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SHIPPING_FIELDS, type ShippingField, shippingFieldErrors } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import styles from "./FundFlow.module.css";

// ② 배송지 (Figma M05). 입력하는 대로 스토어에 저장 → 뒤로 갔다 와도, 새로고침해도 그대로
//
// 19주차 개선 (18주차 우선순위 A): 틀린 입력을 "그 칸에서" 알려 준다
//  - 전: 맨 아래에 "받는 분·연락처·주소를 모두 입력해 주세요" 한 줄 → 어느 칸인지 모르고, 데스크톱에서는 하단 고정 바에 가려졌다
//  - 후: 칸마다 이유(aria-invalid + 설명 연결 → 화면 낭독기도 읽는다) + 첫 번째 틀린 칸으로 이동
//  - "다음"을 한 번 누른 뒤부터는 고치는 대로 바로 표시가 바뀐다 (처음부터 빨간 글씨로 겁주지 않게)
const INPUT_ID: Record<ShippingField, string> = { recipientName: "shipping-name", recipientPhone: "shipping-phone", address: "shipping-address" };

export function ShippingStep({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const draft = useFundingStore();
  const { shipping, setShipping } = draft;
  const [tried, setTried] = useState(false);
  const errors = tried ? shippingFieldErrors(draft) : {};

  function next() {
    const problems = shippingFieldErrors(useFundingStore.getState());
    const first = SHIPPING_FIELDS.find((field) => problems[field]);
    if (!first) return onNext();
    setTried(true);
    document.getElementById(INPUT_ID[first])?.focus(); // 칸으로 이동 — 브라우저가 그 칸이 보이게 스크롤한다
  }

  return (
    <section className={styles.step} aria-labelledby="shipping-step-title">
      <h1 id="shipping-step-title" className="text-heading-m">
        리워드를 받을 곳
      </h1>
      <Field
        id={INPUT_ID.recipientName}
        label="받는 분"
        autoComplete="name"
        value={shipping.recipientName}
        onChange={(e) => setShipping({ recipientName: e.target.value })}
        error={errors.recipientName}
      />
      <Field
        id={INPUT_ID.recipientPhone}
        label="연락처"
        type="tel"
        autoComplete="tel"
        placeholder="010-1234-5678"
        value={shipping.recipientPhone}
        onChange={(e) => setShipping({ recipientPhone: e.target.value })}
        helper="배송 문의가 있을 때만 쓰여요"
        error={errors.recipientPhone}
      />
      <Field
        id={INPUT_ID.address}
        label="주소"
        autoComplete="street-address"
        value={shipping.address}
        onChange={(e) => setShipping({ address: e.target.value })}
        helper="동·호수까지 적어 주세요"
        error={errors.address}
      />
      <p className={styles.notice}>
        배송지는 결제가 끝난 뒤, 이 프로젝트의 창작자에게만 보여요. 테스트 결제라 실제로 받을 물건이 없다면 가짜 주소를 적어도 괜찮아요.
      </p>

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
