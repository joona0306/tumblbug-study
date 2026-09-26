import { describe, expect, it } from "vitest";
import { achievementRate, formatWon } from "./format";

describe("formatWon", () => {
  it("세 자리마다 쉼표를 찍고 '원'을 붙인다", () => {
    expect(formatWon(1560000)).toBe("1,560,000원");
    expect(formatWon(0)).toBe("0원");
  });
});

describe("achievementRate", () => {
  it("모인 금액 ÷ 목표 × 100", () => {
    expect(achievementRate(1_560_000, 2_000_000)).toBe(78);
  });

  it("소수점 아래는 버린다 — 99.9%는 100%가 아니다", () => {
    expect(achievementRate(999, 1000)).toBe(99);
  });

  it("목표를 넘으면 100을 넘는다", () => {
    expect(achievementRate(2_640_000, 2_000_000)).toBe(132);
  });

  it("목표가 0이면 0 (0으로 나누지 않는다)", () => {
    expect(achievementRate(1000, 0)).toBe(0);
  });
});
