import { describe, expect, it } from "vitest";
import { toFieldErrors } from "./auth";
import { projectSchema } from "./project";

const TODAY = "2026-09-26";
const valid = {
  title: "손으로 두드려 만든 구리 펜던트 조명",
  summary: "첫 100개 생산",
  description: "",
  category: "living",
  goalAmount: "2,000,000",
  deadline: "2026-10-08",
};
const errorsOf = (input: object) => {
  const result = projectSchema(TODAY).safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
};

describe("projectSchema", () => {
  it("쉼표가 있는 금액도 숫자로 읽는다", () => {
    const result = projectSchema(TODAY).parse(valid);
    expect(result.goalAmount).toBe(2_000_000);
  });

  it("목표 금액 범위: 10,000원 미만 · 1억 원 초과 · 숫자가 아님", () => {
    expect(errorsOf({ ...valid, goalAmount: "500" }).goalAmount).toBe("10,000원 이상 입력해 주세요");
    expect(errorsOf({ ...valid, goalAmount: "100000001" }).goalAmount).toBe("1억 원 이하로 입력해 주세요");
    expect(errorsOf({ ...valid, goalAmount: "백만원" }).goalAmount).toBe("숫자로 입력해 주세요");
  });

  it("마감일은 내일 ~ 60일 뒤 (경계값 포함)", () => {
    expect(errorsOf({ ...valid, deadline: "2026-09-27" }).deadline).toBeUndefined(); // 내일
    expect(errorsOf({ ...valid, deadline: "2026-11-25" }).deadline).toBeUndefined(); // 60일 뒤
    expect(errorsOf({ ...valid, deadline: "2026-09-26" }).deadline).toMatch(/2026-09-27 ~ 2026-11-25/); // 오늘
    expect(errorsOf({ ...valid, deadline: "2026-11-26" }).deadline).toMatch(/사이로/); // 61일 뒤
  });

  it("정해진 카테고리가 아니면 거절", () => {
    expect(errorsOf({ ...valid, category: "food" }).category).toBe("카테고리를 골라 주세요");
  });

  it("제목은 앞뒤 공백을 지우고 검사한다", () => {
    expect(errorsOf({ ...valid, title: "   " }).title).toBe("제목을 입력해 주세요");
  });
});
