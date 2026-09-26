import * as Sentry from "@sentry/nextjs";
import { parseEnv } from "@/lib/env";

// 서버가 시작될 때 한 번 실행된다 (Next.js 규칙: register 함수)
export async function register() {
  // 환경 변수가 잘못되면 여기서 바로 멈추고 이유를 보여준다 (3단계의 zod 검사)
  parseEnv(process.env);

  // 서버 종류에 맞는 Sentry 설정을 불러온다
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// 서버에서 처리하지 못한 에러(페이지·API·서버 액션)를 Sentry로 보낸다
export const onRequestError = Sentry.captureRequestError;
