import { z } from "zod";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { confirmLoadTestOrder, LOAD_TEST_HEADER, loadTestAllowed, slowApprovingToss } from "@/lib/load-test";

// POST /api/load-test/confirm — 결제 승인 1건 (진짜 승인 함수 + 가짜 토스). k6 의 가상 사용자 50명이 동시에 부른다
// 결과(성공·품절)와 상관없이 200 으로 답한다 → "요청이 실패했나"와 "결제가 실패했나"를 구분하기 위해
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderId: z.string().startsWith("loadtest-"), // 부하 테스트가 만든 주문만
  supporterId: z.string().startsWith("loadtest-"),
});

const toss = slowApprovingToss(200);

export async function POST(request: Request) {
  if (!loadTestAllowed(process.env, request.headers.get(LOAD_TEST_HEADER))) return apiError("NOT_FOUND", "없는 주소예요");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_BODY", "orderId·supporterId 를 확인해 주세요");
  return Response.json(await confirmLoadTestOrder(db, toss, parsed.data));
}
