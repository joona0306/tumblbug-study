import { describe, expect, it } from "vitest";
import { allowedStep, type Draft, maxQuantity, rewardStepError, totalAmount } from "./rules";

const rewards = [
  { id: 1, price: 35_000, limitQty: 100, soldQty: 12, needsShipping: true },
  { id: 2, price: 29_000, limitQty: 30, soldQty: 30, needsShipping: true }, // 품절
  { id: 3, price: 10_000, limitQty: 3, soldQty: 1, needsShipping: false }, // 2개 남음, 배송 없음
];
const empty = { recipientName: "", recipientPhone: "", address: "" };
const filled = { recipientName: "김모아", recipientPhone: "010-1234-5678", address: "서울시 마포구 월드컵로 12길 34" };
const draft = (d: Partial<Draft>): Draft => ({ rewardId: 1, quantity: 1, extraAmount: 0, shipping: empty, ...d });

describe("총액·수량", () => {
  it("총액 = 가격 × 수량 + 추가 후원금, 리워드 없이는 추가 후원금만", () => {
    expect(totalAmount(draft({ quantity: 2, extraAmount: 5_000 }), rewards)).toBe(75_000);
    expect(totalAmount(draft({ rewardId: null, extraAmount: 3_000 }), rewards)).toBe(3_000);
  });

  it("고를 수 있는 수량 = min(남은 수량, 5)", () => {
    expect(maxQuantity(rewards[0])).toBe(5);
    expect(maxQuantity(rewards[1])).toBe(0);
    expect(maxQuantity(rewards[2])).toBe(2);
  });
});

describe("1단계 검사", () => {
  it("품절·수량 초과·금액 범위", () => {
    expect(rewardStepError(draft({ rewardId: 2 }), rewards)).toBe("이 리워드는 품절됐어요");
    expect(rewardStepError(draft({ rewardId: 3, quantity: 3 }), rewards)).toBe("수량은 1~2개로 골라 주세요");
    expect(rewardStepError(draft({ rewardId: null, extraAmount: 500 }), rewards)).toBe("1,000원 이상 후원해 주세요");
    expect(rewardStepError(draft({ rewardId: null, extraAmount: 1_000_001 }), rewards)).toMatch(/1,000,000원까지/);
    expect(rewardStepError(draft({}), rewards)).toBeNull();
  });
});

describe("단계 이동 규칙 allowedStep", () => {
  it("1단계를 안 끝내고 3단계로 오면 1단계로", () => {
    expect(allowedStep(3, draft({ rewardId: 2 }), rewards)).toBe(1);
  });

  it("배송 리워드인데 배송지가 비었으면 3단계 대신 2단계로", () => {
    expect(allowedStep(3, draft({ shipping: empty }), rewards)).toBe(2);
    expect(allowedStep(3, draft({ shipping: filled }), rewards)).toBe(3);
  });

  it("배송이 필요 없는 리워드·리워드 없이 후원은 2단계를 건너뛴다", () => {
    expect(allowedStep(2, draft({ rewardId: 3 }), rewards)).toBe(3);
    expect(allowedStep(3, draft({ rewardId: null, extraAmount: 5_000 }), rewards)).toBe(3);
  });

  it("연락처 모양이 틀리면 2단계에 머문다", () => {
    expect(allowedStep(3, draft({ shipping: { ...filled, recipientPhone: "12345" } }), rewards)).toBe(2);
  });
});
