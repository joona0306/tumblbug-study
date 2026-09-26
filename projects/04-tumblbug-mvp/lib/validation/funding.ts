import { z } from "zod";
import { FUNDING_LIMITS } from "@/lib/funding/rules";

// 브라우저가 보낸 후원서의 "모양" 검사. 금액·재고처럼 DB를 봐야 아는 검사는 lib/funding/quote.ts 에서.
// 주의: 총액은 받지 않는다 — 브라우저가 보낸 금액은 얼마든지 고칠 수 있으니 서버가 다시 계산한다.
export const fundingDraftSchema = z.object({
  projectId: z.number().int().positive(),
  rewardId: z.number().int().positive().nullable(),
  quantity: z.number().int().min(1).max(FUNDING_LIMITS.maxQuantity),
  extraAmount: z.number().int().min(0).max(FUNDING_LIMITS.maxAmount),
  shipping: z.object({
    recipientName: z.string().trim().max(40),
    recipientPhone: z.string().trim().max(20),
    address: z.string().trim().max(200),
  }),
  message: z.string().trim().max(200),
});

export type FundingDraftInput = z.infer<typeof fundingDraftSchema>;
