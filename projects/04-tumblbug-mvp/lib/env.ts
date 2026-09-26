import { z } from "zod";

// 환경 변수의 "모양"을 한 곳에서 선언하고 검사한다.
// 빠뜨리거나 잘못 넣으면 앱이 이상하게 동작하는 대신, 시작할 때 무엇이 틀렸는지 바로 알려준다.
// 주차가 지날수록 여기에 항목이 늘어난다 (6주차 DATABASE_URL, 7주차 BETTER_AUTH_SECRET …)
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Sentry 주소 (6단계). 비워 두면 에러 모니터링을 끈 채로 동작한다.
  NEXT_PUBLIC_SENTRY_DSN: z.url({ error: "NEXT_PUBLIC_SENTRY_DSN은 https:// 로 시작하는 주소여야 합니다" }).optional(),
});

export type Env = z.infer<typeof envSchema>;

// 값 묶음을 받아 검사한다 (테스트하기 쉽도록 process.env를 직접 읽지 않고 인자로 받는다)
export function parseEnv(values: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(values);
  if (!result.success) {
    throw new Error(`환경 변수가 올바르지 않습니다:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
