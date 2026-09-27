import { timingSafeEqual } from "node:crypto";
import { count, eq, inArray, like } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, paymentEvent, project, reward, user } from "@/db/schema";
import { confirmFunding, type ConfirmResult } from "@/lib/funding/confirm";
import type { TossClient } from "@/lib/payments/toss";

// 부하 테스트 전용 (16주차 k6) — "남은 1개를 50명이 동시에" 결제 승인해도 초과 판매가 0건인지 확인한다
// 진짜 서버·진짜 DB·진짜 승인 함수(confirmFunding)를 그대로 쓰고, 토스만 가짜로 바꾼다 (결제창은 사람이 눌러야 해서 흉내 낼 수 없다)
//
// 안전장치 — 이 기능은 평소에는 "없는 주소"(404)다:
//  ① 서버 환경 변수 LOAD_TEST_SECRET 이 있어야 하고, 요청 머리글 x-load-test-secret 이 같아야 한다
//  ② Vercel(운영·미리보기)에서는 값이 있어도 무조건 꺼진다 — 이중 잠금
//  ③ 시험 데이터는 @loadtest.moa.test 계정으로만 만들고, 그것만 지운다

export const LOAD_TEST_HEADER = "x-load-test-secret";
const EMAIL_DOMAIN = "loadtest.moa.test";
const CREATOR_ID = "loadtest-creator";

export function loadTestAllowed(env: Record<string, string | undefined>, headerValue: string | null): boolean {
  if (env.VERCEL) return false; // Vercel 이 모든 배포에 넣어 주는 값 → Vercel 에서는 절대 열리지 않는다
  const secret = env.LOAD_TEST_SECRET;
  if (!secret || secret.length < 16 || !headerValue) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(headerValue);
  // 글자를 하나씩 비교하면 "몇 글자째에서 틀렸는지"가 응답 시간으로 샌다 → 항상 같은 시간이 걸리는 비교
  return a.length === b.length && timingSafeEqual(a, b);
}

// 가짜 토스: 진짜 토스처럼 잠깐(기본 0.2초) 기다렸다가 "승인"이라고 답한다
// 기다리는 동안 다른 요청들이 끼어든다 → 동시 요청이 실제로 겹치는 상황을 만든다
export function slowApprovingToss(delayMs = 200): TossClient {
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    confirm: async ({ paymentKey, orderId, amount }) => {
      await wait();
      return { ok: true, payment: { paymentKey, orderId, status: "DONE", totalAmount: amount } };
    },
    getPayment: async () => ({ ok: false, code: "NOT_FOUND_PAYMENT", message: "부하 테스트에는 결제 조회가 없다" }),
  };
}

// 이전 시험 데이터 지우기 — 지우는 순서가 중요하다 (후원이 프로젝트·사용자를 가리키므로 후원부터)
export async function cleanupLoadTest(db: Db) {
  const users = await db.select({ id: user.id }).from(user).where(like(user.email, `%@${EMAIL_DOMAIN}`));
  if (users.length === 0) return;
  const ids = users.map((u) => u.id);
  const orders = await db.select({ orderId: funding.orderId }).from(funding).where(inArray(funding.supporterId, ids));
  if (orders.length > 0) await db.delete(paymentEvent).where(inArray(paymentEvent.orderId, orders.map((o) => o.orderId)));
  await db.delete(funding).where(inArray(funding.supporterId, ids));
  await db.delete(project).where(eq(project.creatorId, CREATOR_ID)); // 리워드는 cascade 로 함께 지워진다
  await db.delete(user).where(inArray(user.id, ids));
}

export type LoadTestOrder = { orderId: string; supporterId: string };

// 준비: 수량 한정 리워드(stock 개) 1개짜리 프로젝트 + 서로 다른 후원자 buyers 명의 "결제 대기" 후원
export async function setupLoadTest(db: Db, options: { buyers: number; stock: number }) {
  await cleanupLoadTest(db);
  const supporters = Array.from({ length: options.buyers }, (_, i) => ({
    id: `loadtest-supporter-${i + 1}`,
    name: `부하 테스트 ${i + 1}`,
    email: `supporter-${i + 1}@${EMAIL_DOMAIN}`,
  }));
  await db.insert(user).values([{ id: CREATOR_ID, name: "부하 테스트 창작자", email: `creator@${EMAIL_DOMAIN}` }, ...supporters]);

  const [p] = await db
    .insert(project)
    .values({ creatorId: CREATOR_ID, title: "[부하 테스트] 한정 1개", summary: "k6 부하 테스트용", category: "living", goalAmount: 1_000_000, deadline: "2099-12-31", imageUrl: "https://example.com/load-test.jpg", hidden: true })
    .returning({ id: project.id });
  const [r] = await db
    .insert(reward)
    .values({ projectId: p.id, title: "한정 리워드", price: 30_000, limitQty: options.stock, deliveryMonth: "2099-01-01", needsShipping: false })
    .returning({ id: reward.id });

  const orders: LoadTestOrder[] = supporters.map((s) => ({ orderId: `loadtest-${p.id}-${s.id}`, supporterId: s.id }));
  await db.insert(funding).values(orders.map((o) => ({ projectId: p.id, supporterId: o.supporterId, rewardId: r.id, quantity: 1, amount: 30_000, orderId: o.orderId })));
  return { projectId: p.id, rewardId: r.id, orders };
}

// 승인 1건 — 진짜 결제 승인 함수를 가짜 토스로 부른다 (금액도 서버가 기록한 금액 그대로)
export function confirmLoadTestOrder(db: Db, toss: TossClient, order: LoadTestOrder): Promise<ConfirmResult> {
  return confirmFunding(db, toss, { orderId: order.orderId, paymentKey: `loadtest-pay-${order.orderId}`, amount: 30_000, supporterId: order.supporterId });
}

// 결과: 판매 수 / 한정 수량 / 성공 / 품절 실패 / 그 밖
export async function loadTestResult(db: Db, projectId: number) {
  const [r] = await db.select({ soldQty: reward.soldQty, limitQty: reward.limitQty }).from(reward).where(eq(reward.projectId, projectId));
  const rows = await db
    .select({ status: funding.status, failReason: funding.failReason, n: count() })
    .from(funding)
    .where(eq(funding.projectId, projectId))
    .groupBy(funding.status, funding.failReason);
  const sum = (match: (row: (typeof rows)[number]) => boolean) => rows.filter(match).reduce((total, row) => total + row.n, 0);
  return {
    soldQty: r?.soldQty ?? 0,
    limitQty: r?.limitQty ?? null,
    paid: sum((row) => row.status === "paid"),
    soldOut: sum((row) => row.status === "failed" && row.failReason === "SOLD_OUT"),
    other: sum((row) => !(row.status === "paid" || (row.status === "failed" && row.failReason === "SOLD_OUT"))),
  };
}
