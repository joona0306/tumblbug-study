import { z } from "zod";

// 환경 변수의 "모양"을 한 곳에서 선언하고 검사한다.
// 빠뜨리거나 잘못 넣으면 앱이 이상하게 동작하는 대신, 시작할 때 무엇이 틀렸는지 바로 알려준다.

// .env.local 에 "이름=" 처럼 빈 값으로 두면 빈 글자("")가 들어오므로 "없음"으로 바꿔서 검사한다.
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // DB 접속 주소 (6주차). Neon 이든 내 컴퓨터·CI의 PostgreSQL 이든 같은 모양이다.
  DATABASE_URL: z
    .string({ error: "DATABASE_URL이 없습니다. .env.local 에 DB 접속 주소를 넣어 주세요" })
    .regex(/^postgres(ql)?:\/\//, { error: "DATABASE_URL은 postgresql:// 로 시작해야 합니다" }),

  // 로그인 쿠키 서명용 비밀키 (6주차에 준비, 7주차 로그인에서 사용). 32자 이상의 무작위 글자.
  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET이 없습니다" })
    .min(32, { error: "BETTER_AUTH_SECRET은 32자 이상이어야 합니다" }),
  BETTER_AUTH_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),

  // Sentry 주소 (5주차). 비워 두면 에러 모니터링을 끈 채로 동작한다.
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
    emptyToUndefined,
    z.url({ error: "NEXT_PUBLIC_SENTRY_DSN은 주소 형식이어야 합니다 (예: https://…@….ingest.sentry.io/…)" }).optional(),
  ),

  // 토스페이먼츠 결제위젯 키 (11주차). 비워 두면 결제 버튼이 꺼진 채로 동작한다 (CI처럼 키가 없는 곳).
  // 이 교재는 테스트 결제만 한다 → 실수로 라이브 키(live_)를 넣으면 시작할 때 막는다
  NEXT_PUBLIC_TOSS_CLIENT_KEY: z.preprocess(
    emptyToUndefined,
    z.string().startsWith("test_", { error: "NEXT_PUBLIC_TOSS_CLIENT_KEY는 test_ 로 시작하는 테스트 키만 넣어 주세요" }).optional(),
  ),
  TOSS_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z.string().startsWith("test_", { error: "TOSS_SECRET_KEY는 test_ 로 시작하는 테스트 키만 넣어 주세요" }).optional(),
  ),
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

// 서버 코드에서 쓰는 검사된 환경 변수. 처음 쓸 때 한 번만 검사한다.
let cached: Env | undefined;
export function serverEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
