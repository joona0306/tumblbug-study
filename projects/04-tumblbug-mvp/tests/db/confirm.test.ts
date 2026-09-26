import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { funding, paymentEvent, project, reward, user } from "@/db/schema";
import { confirmFunding } from "@/lib/funding/confirm";
import type { TossClient, TossResult } from "@/lib/payments/toss";

// 결제 승인 테스트. confirmFunding 이 트랜잭션을 여러 번 쓰므로 "끝나면 되돌리기" 대신
// 진짜로 저장하고 테스트마다 지운다 (transaction.test.ts 와 같은 방식)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 12 });
const db = drizzle({ client: pool, schema });
const created = { users: [] as string[], projects: [] as number[], orders: [] as string[] };

// 가짜 토스: 진짜 토스를 부르지 않고, 부른 횟수를 세고, 정해 둔 답을 돌려준다
function fakeToss(answer: (paymentKey: string, orderId: string, amount: number) => TossResult | Promise<TossResult> = okAnswer) {
  const calls: string[] = [];
  const client: TossClient = {
    confirm: async ({ paymentKey, orderId, amount }) => {
      calls.push(orderId);
      return answer(paymentKey, orderId, amount);
    },
    getPayment: async () => ({ ok: false, code: "NOT_USED", message: "" }),
  };
  return { client, calls };
}
function okAnswer(paymentKey: string, orderId: string, amount: number): TossResult {
  return { ok: true, payment: { paymentKey, orderId, status: "DONE", totalAmount: amount } };
}

let seq = 0;
async function setup(limitQty: number | null, soldQty = 0) {
  const id = `confirm-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(user).values([
    { id: `${id}-c`, name: "창작자", email: `${id}-c@example.com` },
    { id: `${id}-s`, name: "후원자", email: `${id}-s@example.com` },
  ]);
  created.users.push(`${id}-c`, `${id}-s`);
  const [{ id: projectId }] = await db
    .insert(project)
    .values({ creatorId: `${id}-c`, title: "승인 테스트", summary: "s", category: "living", goalAmount: 100_000, deadline: "2099-12-31", imageUrl: "https://example.com/a.jpg" })
    .returning({ id: project.id });
  created.projects.push(projectId);
  const [{ id: rewardId }] = await db
    .insert(reward)
    .values({ projectId, title: "한정 리워드", price: 10_000, limitQty, soldQty, deliveryMonth: "2099-01-01" })
    .returning({ id: reward.id });
  return { supporterId: `${id}-s`, projectId, rewardId };
}

// 결제 대기 후원 하나 (startFunding 이 만드는 것과 같은 모양)
async function pendingFunding(s: Awaited<ReturnType<typeof setup>>, quantity = 1) {
  seq += 1;
  const orderId = `confirm-order-${Date.now()}-${seq}`;
  created.orders.push(orderId);
  await db.insert(funding).values({ projectId: s.projectId, supporterId: s.supporterId, rewardId: s.rewardId, quantity, amount: 10_000 * quantity, orderId });
  return { orderId, paymentKey: `pk-${orderId}`, amount: 10_000 * quantity, supporterId: s.supporterId };
}

const fundingOf = async (orderId: string) => (await db.select().from(funding).where(eq(funding.orderId, orderId)))[0];
const soldQtyOf = async (rewardId: number) => (await db.select({ n: reward.soldQty }).from(reward).where(eq(reward.id, rewardId)))[0].n;

afterEach(async () => {
  if (created.orders.length) await db.delete(paymentEvent).where(inArray(paymentEvent.orderId, created.orders));
  if (created.projects.length) {
    await db.delete(funding).where(inArray(funding.projectId, created.projects));
    await db.delete(project).where(inArray(project.id, created.projects));
  }
  if (created.users.length) await db.delete(user).where(inArray(user.id, created.users));
  created.users = [];
  created.projects = [];
  created.orders = [];
});
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
    const events = await db.select().from(paymentEvent).where(eq(paymentEvent.orderId, order.orderId));
    expect(events.map((e) => e.status)).toEqual(["DONE"]);
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
    const toss = fakeToss(() => ({ ok: false, code: "REJECT_CARD_COMPANY", message: "카드사에서 거절했어요" }));
    expect(await confirmFunding(db, toss.client, order)).toMatchObject({ status: "failed", reason: "REJECT_CARD_COMPANY", message: "카드사에서 거절했어요" });
    expect(await soldQtyOf(s.rewardId)).toBe(0);
    expect((await fundingOf(order.orderId)).status).toBe("failed");
  });

  it("토스 응답을 못 받으면 '처리 중'으로 두고 재고도 잡아 둔다 (웹훅이 마무리)", async () => {
    const s = await setup(10);
    const order = await pendingFunding(s);
    const toss = fakeToss(() => {
      throw new Error("timeout");
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
    const toss = fakeToss(async (...args) => {
      await new Promise((r) => setTimeout(r, 200)); // 승인에 시간이 걸리는 동안 두 번째 요청이 온다
      return okAnswer(...args);
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
