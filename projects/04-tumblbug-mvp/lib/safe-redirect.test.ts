import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath (오픈 리다이렉트 막기)", () => {
  it("우리 사이트 안의 경로는 그대로", () => {
    expect(safeRedirectPath("/projects/3/fund?step=2")).toBe("/projects/3/fund?step=2");
  });

  it("바깥 주소는 기본 주소로", () => {
    expect(safeRedirectPath("https://evil.example.com")).toBe("/");
    expect(safeRedirectPath("//evil.example.com")).toBe("/"); // 브라우저는 https://evil.example.com 으로 본다
    expect(safeRedirectPath("/\\evil.example.com")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("값이 없거나 글자가 아니면 기본 주소로", () => {
    expect(safeRedirectPath(null, "/studio")).toBe("/studio");
    expect(safeRedirectPath(undefined)).toBe("/");
  });
});
