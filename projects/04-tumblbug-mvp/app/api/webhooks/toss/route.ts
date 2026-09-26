import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { handleTossWebhook, tossWebhookSchema } from "@/lib/funding/webhook";
import { tossClient } from "@/lib/payments/toss";

// POST /api/webhooks/toss — 토스페이먼츠가 결제 상태가 바뀔 때마다 보내는 알림 (웹훅)
// 토스 개발자센터 → 웹훅 → "https://배포주소/api/webhooks/toss" 등록, 이벤트: PAYMENT_STATUS_CHANGED (14주차 배포 후)
// 규칙: 200으로 답하면 "잘 받았음". 그 밖의 응답이나 무응답이면 토스가 최대 7번까지 간격을 늘리며 다시 보낸다
export async function POST(request: Request) {
  const parsed = tossWebhookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_BODY", "웹훅 내용이 올바르지 않아요");

  try {
    const result = await handleTossWebhook(db, tossClient, parsed.data);
    console.log(`[웹훅] ${parsed.data.eventType} orderId=${parsed.data.data.orderId} status=${parsed.data.data.status} → ${result}`);
    return NextResponse.json({ result });
  } catch (error) {
    // DB·토스 조회 실패 등 → 500: 토스가 나중에 다시 보내게 한다. Sentry에 남겨 운영 중에 알아차린다
    Sentry.captureException(error);
    console.error("[웹훅] 처리 실패", error);
    return apiError("INTERNAL", "잠시 후 다시 보내 주세요");
  }
}
