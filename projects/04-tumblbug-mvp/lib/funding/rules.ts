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

export function shippingStepError(draft: Draft): string | null {
  const { recipientName, recipientPhone, address } = draft.shipping;
  if (!recipientName.trim() || !recipientPhone.trim() || !address.trim()) return "받는 분·연락처·주소를 모두 입력해 주세요";
  if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(recipientPhone.trim())) return "연락처는 010-1234-5678 모양으로 입력해 주세요";
  return null;
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
