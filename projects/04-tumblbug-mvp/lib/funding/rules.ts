// 여러 단계 후원의 규칙 (순수 함수 — 브라우저·서버 모두 같은 규칙을 쓴다)
// 금액 규칙은 DB의 CHECK(후원 1,000~1,000,000원, 수량 1~5개)와 같다.

export const FUNDING_LIMITS = { minAmount: 1_000, maxAmount: 1_000_000, maxQuantity: 5 } as const;

export type RewardForRules = { id: number; price: number; limitQty: number | null; soldQty: number; needsShipping: boolean };

export type Draft = {
  rewardId: number | null; // null = 리워드 없이 후원
  quantity: number;
  extraAmount: number; // 추가 후원금 (리워드 없이 후원이면 이것이 전부)
  shipping: { recipientName: string; recipientPhone: string; address: string };
};

// 총액 = 리워드 가격 × 수량 + 추가 후원금
export function totalAmount(draft: Pick<Draft, "rewardId" | "quantity" | "extraAmount">, rewards: RewardForRules[]): number {
  const reward = rewards.find((r) => r.id === draft.rewardId);
  return (reward ? reward.price * draft.quantity : 0) + draft.extraAmount;
}

// 이 리워드를 몇 개까지 고를 수 있나 = 남은 수량과 5개 중 작은 값
export function maxQuantity(reward: RewardForRules): number {
  const remaining = reward.limitQty === null ? Number.POSITIVE_INFINITY : reward.limitQty - reward.soldQty;
  return Math.max(0, Math.min(FUNDING_LIMITS.maxQuantity, remaining));
}

// 1단계(리워드) 선택이 올바른가 — 올바르면 null, 아니면 이유
export function rewardStepError(draft: Draft, rewards: RewardForRules[]): string | null {
  const reward = rewards.find((r) => r.id === draft.rewardId);
  if (draft.rewardId !== null && !reward) return "리워드를 다시 골라 주세요";
  if (reward) {
    if (maxQuantity(reward) === 0) return "이 리워드는 품절됐어요";
    if (draft.quantity < 1 || draft.quantity > maxQuantity(reward)) return `수량은 1~${maxQuantity(reward)}개로 골라 주세요`;
  }
  if (!Number.isInteger(draft.extraAmount) || draft.extraAmount < 0) return "추가 후원금은 0원 이상 정수로 입력해 주세요";
  const total = totalAmount(draft, rewards);
  if (total < FUNDING_LIMITS.minAmount) return "1,000원 이상 후원해 주세요";
  if (total > FUNDING_LIMITS.maxAmount) return "한 번에 1,000,000원까지 후원할 수 있어요";
  return null;
}

// 배송지가 필요한가 — 배송이 필요한 리워드를 골랐을 때만
export function needsShipping(draft: Pick<Draft, "rewardId">, rewards: RewardForRules[]): boolean {
  return rewards.find((r) => r.id === draft.rewardId)?.needsShipping ?? false;
}

// 배송지 칸마다 무엇이 틀렸나 (19주차 개선 — 전에는 "모두 입력해 주세요" 한 줄만 보여 줘서 어느 칸인지 몰랐다)
// 화면(ShippingStep)은 이 결과를 칸 아래에 하나씩 보여 주고, 서버(quote.ts)는 첫 번째 문장을 쓴다 — 규칙은 여기 한 곳
export type ShippingField = keyof Draft["shipping"];
export const SHIPPING_FIELDS: ShippingField[] = ["recipientName", "recipientPhone", "address"]; // 화면 위에서 아래 순서
export function shippingFieldErrors(draft: Draft): Partial<Record<ShippingField, string>> {
  const { recipientName, recipientPhone, address } = draft.shipping;
  const errors: Partial<Record<ShippingField, string>> = {};
  if (!recipientName.trim()) errors.recipientName = "받는 분 이름을 입력해 주세요";
  if (!recipientPhone.trim()) errors.recipientPhone = "연락처를 입력해 주세요";
  else if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(recipientPhone.trim())) errors.recipientPhone = "연락처는 010-1234-5678 모양으로 입력해 주세요";
  if (!address.trim()) errors.address = "주소를 입력해 주세요";
  return errors;
}

// 배송지 단계를 통과할 수 없는 이유 하나 (없으면 null) — 단계 이동 검사·서버 검사용
export function shippingStepError(draft: Draft): string | null {
  const errors = shippingFieldErrors(draft);
  const first = SHIPPING_FIELDS.find((field) => errors[field]);
  return first ? errors[first]! : null;
}

export type Step = 1 | 2 | 3;

// 요청한 단계에 들어갈 수 있나? 앞 단계를 안 끝냈으면 끝내지 않은 가장 앞 단계로 보낸다.
// (주소창에 ?step=3 을 직접 쳐서 건너뛰는 것을 막는다 — 서버도 3단계에서 한 번 더 검사한다)
export function allowedStep(requested: Step, draft: Draft, rewards: RewardForRules[]): Step {
  if (requested === 1 || rewardStepError(draft, rewards)) return 1;
  const shipping = needsShipping(draft, rewards);
  if (requested === 2) return shipping ? 2 : 3; // 배송이 필요 없으면 2단계는 건너뛴다
  if (shipping && shippingStepError(draft)) return 2;
  return 3;
}
