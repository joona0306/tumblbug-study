import { z } from "zod";

// 리워드 입력 검사 (PRD C-4). DB의 CHECK(가격 1,000~1,000,000, 한정 수량 > 0)와 같은 규칙.
export const REWARD_LIMITS = { titleMax: 40, descriptionMax: 200, priceMin: 1_000, priceMax: 1_000_000, qtyMax: 10_000, perProject: 10 } as const;

const toNumber = (value: unknown) => (typeof value === "string" ? Number(value.replaceAll(",", "").trim() || Number.NaN) : value);

// thisMonth = "YYYY-MM" (한국 시간 이번 달) — 지난달에 전달하겠다는 약속은 막는다
export function rewardSchema(thisMonth: string) {
  return z.object({
    title: z.string().trim().min(1, { error: "리워드 이름을 입력해 주세요" }).max(REWARD_LIMITS.titleMax, { error: `${REWARD_LIMITS.titleMax}자 이하로 써 주세요` }),
    description: z.string().trim().max(REWARD_LIMITS.descriptionMax, { error: `${REWARD_LIMITS.descriptionMax}자 이하로 써 주세요` }),
    price: z.preprocess(
      toNumber,
      z
        .number({ error: "숫자로 입력해 주세요" })
        .int({ error: "원 단위 정수로 입력해 주세요" })
        .min(REWARD_LIMITS.priceMin, { error: "1,000원 이상 입력해 주세요" })
        .max(REWARD_LIMITS.priceMax, { error: "1,000,000원 이하로 입력해 주세요" }),
    ),
    // 비워 두면 무제한(null)
    limitQty: z.preprocess(
      (value) => (value === "" || value === undefined ? null : toNumber(value)),
      z
        .number({ error: "숫자로 입력해 주세요" })
        .int({ error: "개수는 정수로 입력해 주세요" })
        .min(1, { error: "1개 이상 입력하거나, 비워서 무제한으로 두세요" })
        .max(REWARD_LIMITS.qtyMax, { error: `${REWARD_LIMITS.qtyMax.toLocaleString()}개 이하로 입력해 주세요` })
        .nullable(),
    ),
    // <input type="month"> 값 "YYYY-MM" → DB에는 그달 1일로 저장
    deliveryMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, { error: "전달 예정 달을 골라 주세요" })
      .refine((m) => m >= thisMonth, { error: "이번 달 이후로 골라 주세요" })
      .transform((m) => `${m}-01`),
    // 체크박스: 체크하면 "on", 안 하면 값이 없다
    needsShipping: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  });
}

export type RewardInput = z.infer<ReturnType<typeof rewardSchema>>;
