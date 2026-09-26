import { describe, expect, it } from "vitest";
import { addDays, kstToday } from "./dates";

describe("kstToday", () => {
  it("UTC로는 전날 밤이어도 한국은 이미 다음 날", () => {
    // UTC 9월 25일 20:00 = 한국 9월 26일 새벽 5시
    expect(kstToday(new Date("2026-09-25T20:00:00Z"))).toBe("2026-09-26");
  });

  it("한국 시간 자정 직전은 아직 그날", () => {
    // UTC 9월 26일 14:59 = 한국 9월 26일 23:59
    expect(kstToday(new Date("2026-09-26T14:59:00Z"))).toBe("2026-09-26");
  });
});

describe("addDays", () => {
  it("달이 바뀌는 날도 맞게 더한다", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-09-26", 60)).toBe("2026-11-25");
  });
});
