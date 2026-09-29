// 가상 운영 데이터 만들기 (17~20주차 예시 사례):  npm run ops:simulate
//
// 실제 사용자 운영(17~20주차)은 교재를 마친 학습자가 직접 한다. 이 교재의 정답 코드에서는
// "창작자 1명 + 방문자 42명의 2주" 를 가상으로 만들어, 18~20주차(분석 → 개선 → 케이스 스터디)를 시연한다.
// ⚠️ 여기서 나온 숫자는 모두 **가상 사례**다 — 교재·케이스 스터디에 쓸 때 반드시 "가상"이라고 밝힌다
//
// 여러 번 실행해도 같은 결과 (먼저 지우고 다시 넣는다). 무작위 값 없이 정해 둔 시나리오 그대로 넣는다 → 교재의 숫자와 늘 같다
// ⚠️ 안전장치: DB 이름이 _dev 또는 _test 로 끝날 때만 실행한다 (운영 DB 에 가상 데이터를 넣지 않게)

import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { inArray, like, sql } = await import("drizzle-orm");
const { drizzle } = await import("drizzle-orm/node-postgres");
const { Pool } = await import("pg");
const schema = await import("@/db/schema");
const { funding, funnelEvent, project, reward, user } = schema;
const { parseDatabaseUrl } = await import("@/lib/env");
const { getFunnel, getShippingPass } = await import("@/lib/funnel");

const url = parseDatabaseUrl(process.env);
const dbName = new URL(url).pathname.slice(1);
if (!/_(dev|test)$/.test(dbName)) {
  console.error(`[simulate] DB 이름이 "${dbName}" 입니다. _dev 또는 _test 로 끝나는 DB에서만 실행합니다.`);
  process.exit(1);
}
const pool = new Pool({ connectionString: url, max: 2 });
const db = drizzle({ client: pool, schema });

const DOMAIN = "sim.moa.test"; // 가상 계정 이메일은 모두 이 주소로 끝난다 (로그인용 아님 — 비밀번호 없음)
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
// 방문자 i 가 온 시각: 14일 전부터 오늘까지 고르게 퍼뜨린다 (날짜별 모금 그래프가 그럴듯하게)
const visitedAt = (i: number) => new Date(now - (14 - (i % 14)) * DAY + (i % 5) * 60 * 60 * 1000);
const kstDate = (offsetDays: number) => new Date(now + 9 * 60 * 60 * 1000 + offsetDays * DAY).toISOString().slice(0, 10);

// ---------- 0. 이전 가상 데이터 지우기 ----------
const oldUsers = (await db.select({ id: user.id }).from(user).where(like(user.email, `%@${DOMAIN}`))).map((u) => u.id);
if (oldUsers.length > 0) {
  await db.delete(funding).where(inArray(funding.supporterId, oldUsers));
  await db.delete(project).where(inArray(project.creatorId, oldUsers)); // 리워드·퍼널 기록은 cascade
  await db.delete(user).where(inArray(user.id, oldUsers));
}

// ---------- 1. 창작자 + 프로젝트 + 리워드 ----------
const CREATOR = "sim-creator";
await db.insert(user).values({ id: CREATOR, name: "달빛공방 (가상)", email: `creator@${DOMAIN}` });
const [p] = await db
  .insert(project)
  .values({
    creatorId: CREATOR,
    title: "[가상 사례] 손으로 빚은 달항아리 미니 화병",
    summary: "17~20주차 예시 사례용 가상 프로젝트",
    description: "교재의 운영 예시를 위해 만든 가상 프로젝트예요. 실제 창작자·후원자가 아니에요.",
    category: "craft",
    goalAmount: 500_000,
    deadline: kstDate(20),
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200&q=80&fm=jpg",
    createdAt: new Date(now - 15 * DAY),
  })
  .returning({ id: project.id });

const REWARDS = [
  { key: "vase1", title: "미니 화병 1개", price: 25_000, limitQty: 30, needsShipping: true },
  { key: "vase2", title: "미니 화병 2개 세트", price: 45_000, limitQty: 10, needsShipping: true },
  { key: "card", title: "응원만 하기 (디지털 엽서)", price: 5_000, limitQty: null, needsShipping: false },
] as const;
type RewardKey = (typeof REWARDS)[number]["key"];

// ---------- 2. 시나리오: 방문자 42명이 어디까지 갔나 ----------
//  A 상세만 보고 나감                         18명
//  C 배송 리워드 → 배송지 화면에서 멈춤       10명   ← 가장 많이 빠지는 곳 (18주차에 찾는다)
//  D 배송 리워드 → 배송지 → 결제 완료          8명
//  E 배송 리워드 → 배송지 → 결제 실패          2명
//  F 엽서(배송 없음) → 결제 완료               3명
//  G 엽서(배송 없음) → 결제 실패               1명
type Plan = { steps: ("view" | "reward" | "shipping" | "payment_request" | "paid")[]; reward?: RewardKey; qty?: number; extra?: number; fail?: string };
const plans: Plan[] = [
  ...Array.from({ length: 18 }, (): Plan => ({ steps: ["view"] })),
  ...Array.from({ length: 10 }, (): Plan => ({ steps: ["view", "reward", "shipping"], reward: "vase1" })),
  ...Array.from({ length: 5 }, (): Plan => ({ steps: ["view", "reward", "shipping", "payment_request", "paid"], reward: "vase1" })),
  ...Array.from({ length: 2 }, (): Plan => ({ steps: ["view", "reward", "shipping", "payment_request", "paid"], reward: "vase2" })),
  { steps: ["view", "reward", "shipping", "payment_request", "paid"], reward: "vase1", qty: 2 },
  { steps: ["view", "reward", "shipping", "payment_request"], reward: "vase1", fail: "PAY_PROCESS_CANCELED" }, // 결제창을 닫음
  { steps: ["view", "reward", "shipping", "payment_request"], reward: "vase1", fail: "REJECT_CARD_COMPANY" }, // 카드사 거절
  { steps: ["view", "reward", "payment_request", "paid"], reward: "card" },
  { steps: ["view", "reward", "payment_request", "paid"], reward: "card" },
  { steps: ["view", "reward", "payment_request", "paid"], reward: "card", extra: 5_000 },
  { steps: ["view", "reward", "payment_request"], reward: "card", fail: "PAY_PROCESS_CANCELED" },
];

// 판매 수 = 결제 완료된 수량만 (실패한 결제는 재고를 되돌렸다) → 운영 점검의 "재고 어긋남"이 ✅ 여야 한다
const sold = (key: RewardKey) => plans.filter((pl) => pl.reward === key && pl.steps.includes("paid")).reduce((n, pl) => n + (pl.qty ?? 1), 0);
const rewardIds = new Map<RewardKey, number>();
for (const [i, r] of REWARDS.entries()) {
  const [row] = await db
    .insert(reward)
    .values({ projectId: p.id, title: r.title, price: r.price, limitQty: r.limitQty, soldQty: sold(r.key), deliveryMonth: `${kstDate(60).slice(0, 7)}-01`, needsShipping: r.needsShipping, sortOrder: i })
    .returning({ id: reward.id });
  rewardIds.set(r.key, row.id);
}

// ---------- 3. 방문자 행동 넣기 ----------
let fundings = 0;
for (const [index, plan] of plans.entries()) {
  const i = index + 1;
  const visitor = `sim-visitor-${i}`;
  const at = visitedAt(i);
  // 퍼널: 단계마다 몇 분씩 뒤에
  await db.insert(funnelEvent).values(plan.steps.map((step, s) => ({ visitorId: visitor, projectId: p.id, step, createdAt: new Date(at.getTime() + s * 3 * 60 * 1000) })));

  // 결제 요청까지 간 사람만 후원(결제 대기 → 완료/실패) 줄이 생긴다 (실제 앱도 결제 요청 때 만든다)
  if (!plan.steps.includes("payment_request") || !plan.reward) continue;
  const r = REWARDS.find((x) => x.key === plan.reward)!;
  const supporterId = `sim-supporter-${i}`;
  await db.insert(user).values({ id: supporterId, name: `가상 후원자 ${i}`, email: `supporter-${i}@${DOMAIN}` });
  const qty = plan.qty ?? 1;
  const paid = plan.steps.includes("paid");
  const orderId = `sim-${p.id}-${i}`;
  const createdAt = new Date(at.getTime() + plan.steps.indexOf("payment_request") * 3 * 60 * 1000);
  await db.insert(funding).values({
    projectId: p.id,
    supporterId,
    rewardId: rewardIds.get(r.key)!,
    quantity: qty,
    extraAmount: plan.extra ?? 0,
    amount: r.price * qty + (plan.extra ?? 0),
    message: "",
    // 배송지: 가상 사례라 누가 봐도 가짜인 값
    ...(r.needsShipping ? { recipientName: `가상 후원자 ${i}`, recipientPhone: "010-0000-0000", address: "서울시 가상구 예시로 1" } : {}),
    orderId,
    status: paid ? "paid" : "failed",
    paymentKey: paid || plan.fail !== "PAY_PROCESS_CANCELED" ? `sim-pay-${orderId}` : null,
    paidAt: paid ? new Date(createdAt.getTime() + 2 * 60 * 1000) : null,
    failReason: plan.fail ?? null,
    createdAt,
  });
  fundings++;
}

// ---------- 4. 결과 요약 ----------
const funnel = await getFunnel(db, { days: 30, projectId: p.id });
const [total] = await db
  .select({ amount: sql<number>`coalesce(sum(${funding.amount}) filter (where ${funding.status} = 'paid'), 0)::int` })
  .from(funding)
  .where(sql`${funding.projectId} = ${p.id}`);
console.log(`[simulate] ✅ 가상 사례 만들기 끝 — DB: ${dbName} · 프로젝트 ${p.id} · 방문자 ${plans.length}명 · 후원 ${fundings}건 · 모인 금액 ${total.amount.toLocaleString()}원`);
console.log("[simulate] 퍼널 (이 프로젝트만):");
for (const row of funnel) console.log(`  ${String(row.count).padStart(3)}  ${row.label}${row.fromPrevious === null ? "" : `  (앞 단계의 ${row.fromPrevious ?? "-"}%)`}`);
const pass = await getShippingPass(db, { days: 30, projectId: p.id });
console.log(`  ↳ 배송지 통과율 ${pass.rate}% (${pass.passed}/${pass.arrived})`);
console.log(`[simulate] 다음: npm run ops:check -- --project=${p.id}`);
await pool.end();
