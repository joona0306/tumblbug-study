import { describe, expect, it } from "vitest";
import { daysLeft, deadlineEnd, getProjectStatus, remainingLabel, urgentLabel } from "./project-status";

// 한국 시간으로 시각 만들기 (테스트를 읽기 쉽게)
const kst = (dateTime: string) => new Date(`${dateTime}+09:00`);
const DEADLINE = "2026-10-08";
const base = { goalAmount: 2_000_000, deadline: DEADLINE };

describe("deadlineEnd", () => {
  it("마감일 다음 날 00:00 한국 시간 = 그날 15:00 UTC", () => {
    expect(deadlineEnd(DEADLINE).toISOString()).toBe("2026-10-08T15:00:00.000Z");
  });
});

describe("getProjectStatus — 경계값", () => {
  it("마감일 23:59:59 (한국 시간)까지는 모금중", () => {
    expect(getProjectStatus({ ...base, raised: 0, now: kst("2026-10-08T23:59:59") })).toBe("funding");
  });

  it("다음 날 00:00:00 (한국 시간)이 되는 순간 끝난다", () => {
    expect(getProjectStatus({ ...base, raised: 0, now: kst("2026-10-09T00:00:00") })).toBe("failed");
  });

  it("목표를 넘겨도 마감 전이면 아직 모금중 (성공은 마감 뒤에 확정)", () => {
    expect(getProjectStatus({ ...base, raised: 3_000_000, now: kst("2026-10-01T12:00:00") })).toBe("funding");
  });

  it("목표에 '딱' 닿으면 성공", () => {
    expect(getProjectStatus({ ...base, raised: 2_000_000, now: kst("2026-10-09T00:00:00") })).toBe("success");
  });

  it("1원 모자라면 실패", () => {
    expect(getProjectStatus({ ...base, raised: 1_999_999, now: kst("2026-10-09T00:00:00") })).toBe("failed");
  });

  it("UTC로는 아직 10월 8일이지만 한국은 9일 새벽 — 끝난 것으로 본다", () => {
    // UTC 10월 8일 16:00 = 한국 10월 9일 01:00
    expect(getProjectStatus({ ...base, raised: 0, now: new Date("2026-10-08T16:00:00Z") })).toBe("failed");
  });
});

describe("남은 기간 글자", () => {
  it("N일 남음 / 오늘 마감 / 마감", () => {
    expect(remainingLabel(DEADLINE, kst("2026-09-26T10:00:00"))).toBe("12일 남음");
    expect(remainingLabel(DEADLINE, kst("2026-10-08T00:00:01"))).toBe("오늘 마감");
    expect(remainingLabel(DEADLINE, kst("2026-10-08T23:59:59"))).toBe("오늘 마감");
    expect(remainingLabel(DEADLINE, kst("2026-10-09T00:00:00"))).toBe("마감");
  });

  it("남은 날 수는 한국 시간 날짜로 센다 (UTC 밤 = 한국 다음 날)", () => {
    // UTC 9월 26일 20:00 = 한국 9월 27일 → 11일 남음
    expect(daysLeft(DEADLINE, new Date("2026-09-26T20:00:00Z"))).toBe(11);
  });

  it("마감 3일 이내만 D-day 배지", () => {
    expect(urgentLabel(DEADLINE, kst("2026-10-04T09:00:00"))).toBeNull(); // 4일 남음
    expect(urgentLabel(DEADLINE, kst("2026-10-05T09:00:00"))).toBe("D-3");
    expect(urgentLabel(DEADLINE, kst("2026-10-08T09:00:00"))).toBe("D-DAY");
    expect(urgentLabel(DEADLINE, kst("2026-10-09T09:00:00"))).toBeNull(); // 끝남
  });
});
