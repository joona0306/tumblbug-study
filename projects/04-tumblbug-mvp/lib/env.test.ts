import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

// 꼭 있어야 하는 값만 채운 기본 묶음
const required = {
  DATABASE_URL: "postgresql://user:pw@localhost:5432/tumblbug_test",
  BETTER_AUTH_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("꼭 필요한 값만 있으면 나머지는 기본값 (Sentry 꺼짐)", () => {
    expect(parseEnv(required)).toEqual({ ...required, NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:3000" });
  });

  it("DB 주소가 없으면 어떻게 고칠지 알려주며 멈춘다", () => {
    expect(() => parseEnv({ BETTER_AUTH_SECRET: required.BETTER_AUTH_SECRET })).toThrow(/DATABASE_URL이 없습니다/);
  });

  it("DB 주소가 postgresql:// 로 시작하지 않으면 멈춘다", () => {
    expect(() => parseEnv({ ...required, DATABASE_URL: "mysql://localhost/db" })).toThrow(/postgresql:\/\//);
  });

  it("인증 비밀키가 너무 짧으면 멈춘다", () => {
    expect(() => parseEnv({ ...required, BETTER_AUTH_SECRET: "short" })).toThrow(/32자 이상/);
  });

  it(".env.local 에 빈 값으로 둔 선택 항목은 '없음'으로 본다", () => {
    const env = parseEnv({ ...required, NEXT_PUBLIC_SENTRY_DSN: "", BETTER_AUTH_URL: "" });
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("올바른 Sentry 주소는 통과, 주소 모양이 아니면 멈춘다", () => {
    expect(parseEnv({ ...required, NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1" }).NEXT_PUBLIC_SENTRY_DSN).toBe(
      "https://abc@o1.ingest.sentry.io/1",
    );
    expect(() => parseEnv({ ...required, NEXT_PUBLIC_SENTRY_DSN: "sentry-dsn-here" })).toThrow(/주소 형식/);
  });

  it("NODE_ENV에 정해진 값 말고 다른 값이 오면 멈춘다", () => {
    expect(() => parseEnv({ ...required, NODE_ENV: "staging" })).toThrow();
  });
});
