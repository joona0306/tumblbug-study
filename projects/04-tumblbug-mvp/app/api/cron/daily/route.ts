import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { runDailyJobs } from "@/lib/cron/daily";
import { serverEnv } from "@/lib/env";
import { tossClient } from "@/lib/payments/toss";

// GET /api/cron/daily — 하루 한 번 예약 작업 (vercel.json 의 crons: 매일 15:00 UTC = 한국 시간 00:00)
// 아무나 부르지 못하게: Vercel Cron 은 환경 변수 CRON_SECRET 이 있으면 "Authorization: Bearer <그 값>" 을 붙여 부른다
export const maxDuration = 60; // 토스 조회가 여러 건이면 오래 걸릴 수 있다 (초)

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return apiError("INTERNAL", "CRON_SECRET 이 설정되지 않았어요");
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return apiError("UNAUTHORIZED", "예약 작업 비밀값이 맞지 않아요");

  try {
    const summary = await runDailyJobs(db, tossClient);
    // 운영: "예약 작업이 매일 돌았는지" 로그로 확인한다 (15주차 운영 준비에서 이 줄을 찾는다)
    console.log(
      `[예약 작업] 상태 확정 ${summary.finalized.length}건 · 결제 대기 정리 ${JSON.stringify(summary.pendings)} · 요청 수 기록 삭제 ${summary.rateLimitRows}줄`,
    );
    return NextResponse.json(summary);
  } catch (error) {
    Sentry.captureException(error);
    console.error("[예약 작업] 실패", error);
    return apiError("INTERNAL", "예약 작업이 실패했어요");
  }
}
