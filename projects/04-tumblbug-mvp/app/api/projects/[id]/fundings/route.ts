import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { checkProjectOwner, listRecentFundings } from "@/lib/queries/studio";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { projectIdSchema } from "@/lib/validation/likes";

// GET /api/projects/3/fundings — 이 프로젝트의 최근 결제 완료 후원 (창작자 본인만)
// 창작자 화면이 15초마다 부른다(자동 새로고침). 응답: { items: [...] }
//   401 로그인 필요 · 403 남의 프로젝트 · 404 없거나 숨긴 프로젝트 · 429 너무 자주
const RATE_LIMIT = { limit: 30, windowSeconds: 60 }; // 15초마다면 1분에 4번 — 창을 여러 개 열어도 넉넉하다

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return apiError("UNAUTHORIZED", "로그인이 필요해요");

  const parsed = projectIdSchema.safeParse((await params).id);
  if (!parsed.success) return apiError("INVALID_QUERY", "프로젝트 번호가 올바르지 않아요", { fields: { id: parsed.error.issues[0]?.message } });

  const rate = await consumeRateLimit(db, `api:fundings:${me.id}`, RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
  if (!rate.allowed) return apiError("RATE_LIMITED", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요", { headers: rateLimitHeaders(rate) });

  const owner = await checkProjectOwner(db, parsed.data, me.id);
  if (owner === "not_found") return apiError("NOT_FOUND", "프로젝트를 찾을 수 없어요");
  if (owner === "forbidden") return apiError("FORBIDDEN", "내 프로젝트의 후원만 볼 수 있어요");

  return NextResponse.json({ items: await listRecentFundings(db, parsed.data) }, { headers: { "Cache-Control": "private, no-store" } });
}
