import { NextResponse } from "next/server";

// API 응답 규칙 (9주차) — 모든 API가 같은 모양으로 답한다
//   성공: 200 { ...데이터 } / 만들었으면 201
//   실패: { error: { code, message, fields? } } + 알맞은 상태 코드
//     400 입력이 잘못됨 · 401 로그인 필요 · 403 권한 없음 · 404 없음 · 409 충돌(예: 이미 처리됨) · 429 요청이 너무 많음
export type ApiErrorCode = "INVALID_QUERY" | "INVALID_BODY" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED";

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_QUERY: 400,
  INVALID_BODY: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};

export function apiError(code: ApiErrorCode, message: string, options: { fields?: Record<string, string | undefined>; headers?: HeadersInit } = {}) {
  return NextResponse.json({ error: { code, message, ...(options.fields ? { fields: options.fields } : {}) } }, { status: STATUS[code], headers: options.headers });
}
