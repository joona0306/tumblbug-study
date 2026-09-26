import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { rateLimit } from "@/db/schema";

// 요청 수 제한 (고정 시간 칸 방식): 1분을 한 칸으로 보고, 칸마다 요청 수를 센다.
// INSERT ... ON CONFLICT DO UPDATE = "없으면 1로 넣고, 있으면 +1" 을 한 문장으로 (동시에 와도 정확히 센다)
// 지난 시간 칸의 기록은 13주차 예약 작업이 하루 한 번 지운다
export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: Date };

export async function consumeRateLimit(db: Db, key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  // 지금이 속한 시간 칸의 시작 시각: 예) 1분 칸이면 12:34:56 → 12:34:00
  const windowStart = sql`to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds})`;
  const [row] = await db
    .insert(rateLimit)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimit.key, rateLimit.windowStart], set: { count: sql`${rateLimit.count} + 1` } })
    .returning({ count: rateLimit.count, windowStart: rateLimit.windowStart });

  return {
    allowed: row.count <= limit,
    limit,
    remaining: Math.max(0, limit - row.count),
    resetAt: new Date(row.windowStart.getTime() + windowSeconds * 1000),
  };
}

// 요청한 사람의 IP. Vercel·리버스 프록시는 원래 IP를 x-forwarded-for 의 맨 앞에 적어 준다
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

// 응답에 붙일 헤더 (API를 쓰는 쪽이 남은 횟수를 알 수 있게)
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
  };
  if (!r.allowed) headers["Retry-After"] = String(Math.max(1, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000)));
  return headers;
}
