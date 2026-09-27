import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { recordFunnelStep, VISITOR_COOKIE, VISITOR_COOKIE_OPTIONS } from "@/lib/funnel";
import { clientIp, consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { toFieldErrors } from "@/lib/validation/auth";
import { funnelBodySchema } from "@/lib/validation/funnel";

// POST /api/funnel { projectId, step } — 퍼널 단계 기록 (15주차). 응답 204 (돌려줄 내용 없음)
// 방문자 쿠키(moa-vid)가 없으면 여기서 새로 만든다 — 무작위 값이라 누구인지 알 수 없다
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export async function POST(request: NextRequest) {
  const rate = await consumeRateLimit(db, `api:funnel:${clientIp(request.headers)}`, RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
  if (!rate.allowed) return apiError("RATE_LIMITED", "요청이 너무 많아요", { headers: rateLimitHeaders(rate) });

  const parsed = funnelBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_BODY", "요청 값이 올바르지 않아요", { fields: toFieldErrors(parsed.error) });

  // 쿠키는 request.cookies 로 읽는다 (Cookie 헤더 글자를 직접 자르면 틀리기 쉽다 — 실제로 한 번 틀렸다)
  // 모양이 UUID 가 아니면(누가 꾸며 넣은 값) 새로 만든다
  const saved = request.cookies.get(VISITOR_COOKIE)?.value;
  const existing = saved && /^[0-9a-f-]{36}$/.test(saved) ? saved : undefined;
  const visitorId = existing ?? crypto.randomUUID();

  await recordFunnelStep(db, visitorId, parsed.data.projectId, parsed.data.step);
  const response = new NextResponse(null, { status: 204 });
  if (!existing) response.cookies.set(VISITOR_COOKIE, visitorId, { ...VISITOR_COOKIE_OPTIONS, secure: process.env.NODE_ENV === "production" });
  return response;
}
