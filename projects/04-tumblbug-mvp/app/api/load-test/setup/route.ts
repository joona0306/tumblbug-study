import { z } from "zod";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { LOAD_TEST_HEADER, loadTestAllowed, setupLoadTest } from "@/lib/load-test";

// POST /api/load-test/setup — 부하 테스트 준비: 한정 수량 리워드 + 결제 대기 후원 N건 (16주차 k6)
// 잠겨 있으면 "없는 주소"처럼 404 — 이런 주소가 있다는 것조차 알리지 않는다
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  buyers: z.number().int().min(2).max(200).default(50),
  stock: z.number().int().min(1).max(10).default(1),
});

export async function POST(request: Request) {
  if (!loadTestAllowed(process.env, request.headers.get(LOAD_TEST_HEADER))) return apiError("NOT_FOUND", "없는 주소예요");
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_BODY", "buyers(2~200)·stock(1~10) 을 확인해 주세요");
  return Response.json(await setupLoadTest(db, parsed.data));
}
