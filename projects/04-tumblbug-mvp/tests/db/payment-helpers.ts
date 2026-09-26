import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { funding, paymentEvent, project, reward, user } from "@/db/schema";
import type { TossClient, TossResult } from "@/lib/payments/toss";

// 결제 테스트 공용 도우미 (승인·웹훅).
// 결제 코드는 트랜잭션을 여러 번 쓰므로 "끝나면 되돌리기" 대신 진짜로 저장하고 테스트마다 지운다 (transaction.test.ts 와 같은 방식)

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 12 });
export const db = drizzle({ client: pool, schema });
const created = { users: [] as string[], projects: [] as number[], orders: [] as string[] };

type ConfirmAnswer = (paymentKey: string, orderId: string, amount: number) => TossResult | Promise<TossResult>;

export function okAnswer(paymentKey: string, orderId: string, amount: number): TossResult {
  return { ok: true, payment: { paymentKey, orderId, status: "DONE", totalAmount: amount } };
}

// 가짜 토스: 진짜 토스를 부르지 않고, 부른 횟수를 세고, 정해 둔 답을 돌려준다
export function fakeToss(options: { confirm?: ConfirmAnswer; payment?: (paymentKey: string) => TossResult } = {}) {
  const calls: string[] = [];
  const client: TossClient = {
    confirm: async ({ paymentKey, orderId, amount }) => {
      calls.push(orderId);
      return (options.confirm ?? okAnswer)(paymentKey, orderId, amount);
    },
    getPayment: async (paymentKey) => options.payment?.(paymentKey) ?? { ok: false, code: "NOT_FOUND_PAYMENT", message: "존재하지 않는 결제" },
  };
  return { client, calls };
}

export async function setup(limitQty: number | null, soldQty = 0) {
  const id = `pay-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(user).values([
    { id: `${id}-c`, name: "창작자", email: `${id}-c@example.com` },
    { id: `${id}-s`, name: "후원자", email: `${id}-s@example.com` },
  ]);
  created.users.push(`${id}-c`, `${id}-s`);
  const [{ id: projectId }] = await db
    .insert(project)
    .values({ creatorId: `${id}-c`, title: "결제 테스트", summary: "s", category: "living", goalAmount: 100_000, deadline: "2099-12-31", imageUrl: "https://example.com/a.jpg" })
    .returning({ id: project.id });
  created.projects.push(projectId);
  const [{ id: rewardId }] = await db
    .insert(reward)
    .values({ projectId, title: "한정 리워드", price: 10_000, limitQty, soldQty, deliveryMonth: "2099-01-01" })
    .returning({ id: reward.id });
  return { supporterId: `${id}-s`, projectId, rewardId };
}

// 결제 대기 후원 하나 (startFunding 이 만드는 것과 같은 모양)
let seq = 0;
export async function pendingFunding(s: Awaited<ReturnType<typeof setup>>, quantity = 1) {
  seq += 1;
  const orderId = `pay-order-${Date.now()}-${seq}`;
  created.orders.push(orderId);
  await db.insert(funding).values({ projectId: s.projectId, supporterId: s.supporterId, rewardId: s.rewardId, quantity, amount: 10_000 * quantity, orderId });
  return { orderId, paymentKey: `pk-${orderId}`, amount: 10_000 * quantity, supporterId: s.supporterId };
}

export const fundingOf = async (orderId: string) => (await db.select().from(funding).where(eq(funding.orderId, orderId)))[0];
export const soldQtyOf = async (rewardId: number) => (await db.select({ n: reward.soldQty }).from(reward).where(eq(reward.id, rewardId)))[0].n;
export const eventsOf = (orderId: string) => db.select().from(paymentEvent).where(eq(paymentEvent.orderId, orderId));

// 자식 → 부모 순서로 지운다 (결제 기록·후원 → 프로젝트(리워드는 cascade) → 사용자)
export async function cleanup() {
  if (created.orders.length) await db.delete(paymentEvent).where(inArray(paymentEvent.orderId, created.orders));
  if (created.projects.length) {
    await db.delete(funding).where(inArray(funding.projectId, created.projects));
    await db.delete(project).where(inArray(project.id, created.projects));
  }
  if (created.users.length) await db.delete(user).where(inArray(user.id, created.users));
  created.users = [];
  created.projects = [];
  created.orders = [];
}
