import { describe, expect, it } from "vitest";
import { loadTestAllowed } from "./load-test";

// 부하 테스트 주소의 잠금 — 평소에는 무조건 닫혀 있어야 한다 (16주차)
describe("loadTestAllowed", () => {
  const secret = "load-test-secret-0123456789";

  it("비밀값이 서버에 있고 머리글이 같을 때만 열린다", () => {
    expect(loadTestAllowed({ LOAD_TEST_SECRET: secret }, secret)).toBe(true);
  });

  it("서버에 비밀값이 없으면 닫힌다 (평소 상태)", () => {
    expect(loadTestAllowed({}, secret)).toBe(false);
    expect(loadTestAllowed({ LOAD_TEST_SECRET: "" }, "")).toBe(false);
  });

  it("머리글이 없거나 다르면 닫힌다", () => {
    expect(loadTestAllowed({ LOAD_TEST_SECRET: secret }, null)).toBe(false);
    expect(loadTestAllowed({ LOAD_TEST_SECRET: secret }, `${secret}x`)).toBe(false);
    expect(loadTestAllowed({ LOAD_TEST_SECRET: secret }, secret.replace("0", "1"))).toBe(false);
  });

  it("비밀값이 너무 짧으면(16자 미만) 닫힌다", () => {
    expect(loadTestAllowed({ LOAD_TEST_SECRET: "short" }, "short")).toBe(false);
  });

  it("Vercel(운영·미리보기)에서는 비밀값이 맞아도 닫힌다", () => {
    expect(loadTestAllowed({ LOAD_TEST_SECRET: secret, VERCEL: "1" }, secret)).toBe(false);
  });
});
