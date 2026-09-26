import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("아무것도 없으면 기본값으로 동작한다 (Sentry 꺼짐)", () => {
    expect(parseEnv({})).toEqual({ NODE_ENV: "development" });
  });

  it("올바른 Sentry 주소는 통과한다", () => {
    const env = parseEnv({ NODE_ENV: "production", NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1" });
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe("https://abc@o1.ingest.sentry.io/1");
  });

  it("주소 모양이 아니면 이유와 함께 멈춘다", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SENTRY_DSN: "sentry-dsn-here" })).toThrow(/https:\/\//);
  });

  it("NODE_ENV에 정해진 값 말고 다른 값이 오면 멈춘다", () => {
    expect(() => parseEnv({ NODE_ENV: "staging" })).toThrow();
  });
});
