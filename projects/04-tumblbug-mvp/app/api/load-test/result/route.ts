import { db } from "@/db";
import { apiError } from "@/lib/api";
import { cleanupLoadTest, LOAD_TEST_HEADER, loadTestAllowed, loadTestResult } from "@/lib/load-test";

// GET    /api/load-test/result?projectId=… — 판매 수·성공·품절 실패 수 (k6 가 마지막에 확인한다)
// DELETE /api/load-test/result            — 시험 데이터 지우기
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!loadTestAllowed(process.env, request.headers.get(LOAD_TEST_HEADER))) return apiError("NOT_FOUND", "없는 주소예요");
  const projectId = Number(new URL(request.url).searchParams.get("projectId"));
  if (!Number.isInteger(projectId) || projectId <= 0) return apiError("INVALID_QUERY", "projectId 를 확인해 주세요");
  return Response.json(await loadTestResult(db, projectId));
}

export async function DELETE(request: Request) {
  if (!loadTestAllowed(process.env, request.headers.get(LOAD_TEST_HEADER))) return apiError("NOT_FOUND", "없는 주소예요");
  await cleanupLoadTest(db);
  return Response.json({ ok: true });
}
