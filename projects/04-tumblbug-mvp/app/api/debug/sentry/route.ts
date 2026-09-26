// 서버에서 처리하지 않은 에러 → instrumentation.ts 의 onRequestError 가 Sentry로 보낸다
export const dynamic = "force-dynamic";

export function GET() {
  throw new Error("Sentry 테스트 에러 (서버)");
}
