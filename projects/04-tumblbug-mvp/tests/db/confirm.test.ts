import { afterAll, afterEach, describe, expect, it } from "vitest";
import { confirmFunding } from "@/lib/funding/confirm";
import { cleanup, db, eventsOf, fakeToss, fundingOf, okAnswer, pendingFunding, pool, setup, soldQtyOf } from "./payment-helpers";

// 결제 승인 테스트 (토스는 가짜 도구로 바꿔 끼운다 — payment-helpers.ts)
afterEach(cleanup);
afterAll(() => pool.end());

describe("결제 승인 confirmFunding", () => {
  it("성공: 후원 완료 + 재고 차감 + 결제 기록이 함께 남는다", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s, 2);
    const toss = fakeToss();

    expect(await confirmFunding(db, toss.client, order)).toMatchObject({ status: "paid", amount: 20_000 });
    const f = await fundingOf(order.orderId);
    expect(f.status).toBe("paid");
    expect(f.paymentKey).toBe(order.paymentKey);
    expect(f.paidAt).not.toBeNull();
    expect(await soldQtyOf(s.rewardId)).toBe(2);
    expect((await eventsOf(order.orderId)).map((e) => e.status)).toEqual(["DONE"]);
  });

  it("새로고침으로 다시 와도 토스를 다시 부르지 않고 같은 결과", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss();
    await confirmFunding(db, toss.client, order);
    expect(await confirmFunding(db, toss.client, order)).toMatchObject({ status: "paid" });
    expect(toss.calls).toHaveLength(1);
    expect(await soldQtyOf(s.rewardId)).toBe(1);
  });

  it("금액이 다르면 토스를 부르지 않고 실패 (재고도 그대로)", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss();
    expect(await confirmFunding(db, toss.client, { ...order, amount: 100 })).toMatchObject({ status: "failed", reason: "AMOUNT_MISMATCH" });
    expect(toss.calls).toHaveLength(0);
    expect(await soldQtyOf(s.rewardId)).toBe(0);
  });

  it("품절이면 토스를 부르지 않고 실패 (돈이 나가지 않는다)", async () => {
    const s = await setup(3, 3);
    const order = await pendingFunding(s);
    const toss = fakeToss();
    expect(await confirmFunding(db, toss.client, order)).toMatchObject({ status: "failed", reason: "SOLD_OUT" });
    expect(toss.calls).toHaveLength(0);
    expect((await fundingOf(order.orderId)).failReason).toBe("SOLD_OUT");
  });

  it("토스가 거절하면 후원 실패 + 차감했던 재고를 되돌린다", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s, 2);
    const toss = fakeToss({ confirm: () => ({ ok: false, code: "REJECT_CARD_COMPANY", message: "카드사에서 거절했어요" }) });
    expect(await confirmFunding(db, toss.client, order)).toMatchObject({ status: "failed", reason: "REJECT_CARD_COMPANY", message: "카드사에서 거절했어요" });
    expect(await soldQtyOf(s.rewardId)).toBe(0);
    expect((await fundingOf(order.orderId)).status).toBe("failed");
  });

  it("토스 응답을 못 받으면 '처리 중'으로 두고 재고도 잡아 둔다 (웹훅이 마무리)", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss({
      confirm: () => {
        throw new Error("timeout");
      },
    });
    expect(await confirmFunding(db, toss.client, order)).toEqual({ status: "processing" });
    const f = await fundingOf(order.orderId);
    expect(f.status).toBe("pending");
    expect(f.paymentKey).toBe(order.paymentKey);
    expect(await soldQtyOf(s.rewardId)).toBe(1);
  });

  it("같은 주문이 동시에 두 번 와도 토스 승인은 한 번만", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss({
      confirm: async (...args) => {
        await new Promise((r) => setTimeout(r, 200)); // 승인에 시간이 걸리는 동안 두 번째 요청이 온다
        return okAnswer(...args);
      },
    });
    const results = await Promise.all([confirmFunding(db, toss.client, order), confirmFunding(db, toss.client, order)]);
    expect(results.map((r) => r.status).sort()).toEqual(["paid", "processing"]);
    expect(toss.calls).toHaveLength(1);
    expect(await soldQtyOf(s.rewardId)).toBe(1);
  });

  it("남은 1개를 10명이 동시에 결제해도 1명만 승인되고, 초과 판매 0건", async () => {
    const s = await setup(5, 4); // 5개 중 4개 팔림 → 1개 남음
    const orders = await Promise.all(Array.from({ length: 10 }, () => pendingFunding(s)));
    const toss = fakeToss();
    const results = await Promise.all(orders.map((o) => confirmFunding(db, toss.client, o)));

    expect(results.filter((r) => r.status === "paid")).toHaveLength(1);
    expect(results.filter((r) => r.status === "failed" && r.reason === "SOLD_OUT")).toHaveLength(9);
    expect(toss.calls).toHaveLength(1); // 품절인 9명은 토스 승인까지 가지 않았다
    expect(await soldQtyOf(s.rewardId)).toBe(5);
  });

  it("남의 주문 번호로는 승인할 수 없다", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    expect(await confirmFunding(db, fakeToss().client, { ...order, supporterId: "someone-else" })).toEqual({ status: "not_found" });
  });
});
