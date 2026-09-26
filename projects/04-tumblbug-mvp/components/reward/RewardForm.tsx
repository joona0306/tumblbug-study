"use client";

import { useActionState, useEffect, useRef } from "react";
import type { RewardFormState } from "@/app/actions/rewards";
import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { REWARD_LIMITS } from "@/lib/validation/reward";
import styles from "./RewardForm.module.css";

type Props = {
  action: (state: RewardFormState, formData: FormData) => Promise<RewardFormState>;
  projectId: number;
  rewardId?: number; // 있으면 수정
  initialValues?: Record<string, string>;
  priceLocked?: boolean; // 판매된 리워드
  thisMonth: string;
  submitLabel: string;
};

// 리워드 추가·수정 폼 (Figma M08 "새 리워드")
export function RewardForm({ action, projectId, rewardId, initialValues = {}, priceLocked = false, thisMonth, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state && !state.ok ? state.values : initialValues;
  const f = state?.fields ?? {};

  // 새 리워드를 저장하면 폼을 비운다 (수정 폼은 그대로 둔다)
  useEffect(() => {
    if (state?.ok && !rewardId) formRef.current?.reset();
  }, [state, rewardId]);

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="projectId" value={projectId} />
      {rewardId && <input type="hidden" name="rewardId" value={rewardId} />}

      <Field label="리워드 이름" name="title" maxLength={REWARD_LIMITS.titleMax} defaultValue={v.title} error={f.title} />
      <div className={styles.row}>
        <Field
          label="금액 (원)"
          name="price"
          inputMode="numeric"
          defaultValue={v.price}
          error={f.price}
          disabled={priceLocked}
          helper={priceLocked ? "판매된 리워드는 금액을 바꿀 수 없어요" : undefined}
        />
        <Field label="한정 수량" name="limitQty" inputMode="numeric" placeholder="비우면 무제한" defaultValue={v.limitQty} error={f.limitQty} />
      </div>
      <Field label="전달 예정 달" name="deliveryMonth" type="month" min={thisMonth} defaultValue={v.deliveryMonth} error={f.deliveryMonth} />
      <TextAreaField label="설명" name="description" rows={3} maxLength={REWARD_LIMITS.descriptionMax} defaultValue={v.description} error={f.description} />
      <label className={styles.checkbox}>
        <input type="checkbox" name="needsShipping" defaultChecked={(v.needsShipping ?? "on") === "on"} />
        배송이 필요한 리워드예요 (후원할 때 배송지를 받아요)
      </label>

      {state?.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className={styles.ok}>
          저장했어요.
        </p>
      )}
      <Button type="submit" variant="secondary" size="m" disabled={pending}>
        {pending ? "저장 중…" : submitLabel}
      </Button>
    </form>
  );
}
