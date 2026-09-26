"use server";

import { db } from "@/db";
import { type Quote, quoteFunding } from "@/lib/funding/quote";
import { getCurrentUser } from "@/lib/session";
import { fundingDraftSchema } from "@/lib/validation/funding";

// 확인 화면의 "결제하기" → 서버가 후원서를 다시 검사하고 총액을 계산한다.
// 11주차에 여기서 결제 대기(pending) 후원을 만들고 결제창을 연다.
export async function checkFunding(input: unknown): Promise<Quote> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요. 다시 로그인해 주세요", step: null };

  const parsed = fundingDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "후원 내용이 올바르지 않아요. 처음부터 다시 골라 주세요", step: 1 };

  return quoteFunding(db, me.id, parsed.data);
}
