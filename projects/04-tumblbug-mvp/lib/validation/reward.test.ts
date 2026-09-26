import { describe, expect, it } from "vitest";
import { toFieldErrors } from "./auth";
import { rewardSchema } from "./reward";

const THIS_MONTH = "2026-09";
const valid = { title: "구리 펜던트 조명 1개", description: "조명 + 전구", price: "35,000", limitQty: "100", deliveryMonth: "2026-12", needsShipping: "on" };
const errorsOf = (input: object) => {
  const r = rewardSchema(THIS_MONTH).safeParse(input);
  return r.success ? {} : toFieldErrors(r.error);
};

describe("rewardSchema", () => {
  it("쉼표 금액·체크박스·달을 DB 모양으로 바꾼다", () => {
    expect(rewardSchema(THIS_MONTH).parse(valid)).toEqual({
      title: "구리 펜던트 조명 1개",
      description: "조명 + 전구",
      price: 35_000,
      limitQty: 100,
      deliveryMonth: "2026-12-01",
      needsShipping: true,
    });
  });

  it("한정 수량을 비우면 무제한(null), 체크 안 하면 배송 없음", () => {
    const r = rewardSchema(THIS_MONTH).parse({ ...valid, limitQty: "", needsShipping: undefined });
    expect(r.limitQty).toBeNull();
    expect(r.needsShipping).toBe(false);
  });

  it("가격 범위와 한정 수량 0개", () => {
    expect(errorsOf({ ...valid, price: "500" }).price).toBe("1,000원 이상 입력해 주세요");
    expect(errorsOf({ ...valid, price: "1000001" }).price).toBe("1,000,000원 이하로 입력해 주세요");
    expect(errorsOf({ ...valid, limitQty: "0" }).limitQty).toMatch(/1개 이상/);
  });

  it("지난달 전달 약속은 거절, 이번 달은 허용", () => {
    expect(errorsOf({ ...valid, deliveryMonth: "2026-08" }).deliveryMonth).toBe("이번 달 이후로 골라 주세요");
    expect(errorsOf({ ...valid, deliveryMonth: "2026-09" }).deliveryMonth).toBeUndefined();
  });
});
