import { describe, expect, it } from "vitest";
import { parseTheme, themeAttribute } from "./theme";

describe("화면 테마", () => {
  it("아는 값은 그대로, 모르는 값·빈 값은 시스템 설정 따라가기", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme("purple")).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
  });

  it("시스템이면 data-theme 을 붙이지 않는다", () => {
    expect(themeAttribute("system")).toBeUndefined();
    expect(themeAttribute("dark")).toBe("dark");
  });
});
