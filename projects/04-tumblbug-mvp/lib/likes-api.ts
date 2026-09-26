import { db } from "@/db";
import { apiError } from "@/lib/api";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

// 찜 API 공통: 로그인 확인(401) + 사용자별 요청 수 제한(429)
// 찜 버튼을 연달아 눌러도 1분에 30번이면 충분하다 — 그 이상은 자동화된 요청일 가능성
const RATE_LIMIT = { limit: 30, windowSeconds: 60 };

export async function requireLikeUser() {
  const user = await getCurrentUser();
  if (!user) return { error: apiError("UNAUTHORIZED", "로그인이 필요해요") } as const;
  const rate = await consumeRateLimit(db, `api:likes:${user.id}`, RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
  if (!rate.allowed) return { error: apiError("RATE_LIMITED", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요", { headers: rateLimitHeaders(rate) }) } as const;
  return { user } as const;
}

// 개인 데이터 → CDN·브라우저가 저장해 두면 안 된다 (다른 사람에게 내 찜이 보일 수 있다)
export const PRIVATE = { "Cache-Control": "private, no-store" };
