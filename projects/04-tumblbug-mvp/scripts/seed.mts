// 개발용 예시 데이터 넣기:  npm run db:seed
// 여러 번 실행해도 같은 결과가 되도록, 먼저 예시 데이터를 지우고 다시 넣는다.
// ⚠️ 안전장치: DB 이름이 _dev 또는 _test 로 끝날 때만 실행한다 (운영 DB를 실수로 지우지 않게)

import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { like, inArray, sql } = await import("drizzle-orm");
const { db } = await import("@/db");
const { funding, project, projectLike, reward, user, account } = await import("@/db/schema");
const { auth } = await import("@/lib/auth");

// 개발용 계정 비밀번호 (예시 데이터 전용 — 운영에는 절대 쓰지 않는다)
export const SEED_PASSWORD = "moa-dev-1234";
const SEED_EMAIL_DOMAIN = "seed.moa.test"; // 예시 계정 이메일은 모두 이 주소로 끝난다

const dbName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
if (!/_(dev|test)$/.test(dbName)) {
  console.error(`[seed] DB 이름이 "${dbName}" 입니다. _dev 또는 _test 로 끝나는 DB에서만 실행합니다.`);
  process.exit(1);
}

// 한국 시간 기준 "오늘 + n일" 날짜 (YYYY-MM-DD)
function kstDate(offsetDays: number) {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}
const month = (offsetMonths: number) => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offsetMonths, 1);
  return d.toISOString().slice(0, 10);
};

// Unsplash 사진 (Unsplash License). 7주차부터는 창작자가 직접 올린 사진(Vercel Blob)을 쓴다
const photo = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&fm=jpg`;

type SeedProject = {
  creator: { username: string; name: string };
  title: string;
  summary: string;
  description: string;
  category: "living" | "craft" | "publishing" | "music" | "beauty" | "game";
  goal: number;
  deadlineOffset: number; // 오늘로부터 며칠 뒤 마감 (음수 = 이미 마감)
  image: string;
  raisedRate: number; // 모인 금액 비율 (%)
  rewards: { title: string; description: string; price: number; limitQty: number | null; deliveryOffset: number }[];
};

const PROJECTS: SeedProject[] = [
  {
    creator: { username: "ohneul_workshop", name: "오늘의공방" },
    title: "손으로 두드려 만든 구리 펜던트 조명",
    summary: "구리판을 한 장씩 두드려 만든 조명, 첫 100개 생산",
    description: "3년 동안 주문 제작으로만 만들던 조명을 처음으로 100개 생산합니다. 모인 금액은 구리판·전기 부품 구입과 공방 작업대 교체에 씁니다.",
    category: "living",
    goal: 2_000_000,
    deadlineOffset: 12,
    image: photo("photo-1540932239986-30128078f3c5"),
    raisedRate: 78,
    rewards: [
      { title: "[얼리버드] 조명 1개", description: "선착순 30명 한정 할인", price: 29_000, limitQty: 30, deliveryOffset: 3 },
      { title: "구리 펜던트 조명 1개", description: "조명 본체 + 전구 + 설치 설명서", price: 35_000, limitQty: 100, deliveryOffset: 3 },
      { title: "조명 1개 + 각인 서비스", description: "원하는 문구를 조명 안쪽에 새겨 드려요", price: 62_000, limitQty: 30, deliveryOffset: 4 },
    ],
  },
  {
    creator: { username: "heuk_bul", name: "흙과불" },
    title: "산과 들을 담은 수제 머그 2차",
    summary: "물레로 빚고 장작 가마에서 구운 머그",
    description: "1차 펀딩에서 주신 의견을 반영해 손잡이를 더 두껍게 바꿨어요.",
    category: "craft",
    goal: 2_000_000,
    deadlineOffset: 5,
    image: photo("photo-1536936812504-0e77dc3f0b40"),
    raisedRate: 132,
    rewards: [
      { title: "머그 1개", description: "색은 랜덤으로 보내 드려요", price: 32_000, limitQty: null, deliveryOffset: 2 },
      { title: "머그 2개 세트", description: "한 쌍으로 어울리는 색 조합", price: 58_000, limitQty: 40, deliveryOffset: 2 },
    ],
  },
  {
    creator: { username: "golmok_photo", name: "골목사진관" },
    title: "골목 고양이 사진집 2쇄",
    summary: "동네 골목에서 만난 고양이 120마리의 기록",
    description: "초판이 3주 만에 매진되어 2쇄를 찍습니다. 판매 수익 일부는 동네 급식소에 기부해요.",
    category: "publishing",
    goal: 1_500_000,
    deadlineOffset: 3,
    image: photo("photo-1733595223339-d1ae819e4d8e"),
    raisedRate: 32,
    rewards: [
      { title: "사진집 1권", description: "A5, 192쪽", price: 22_000, limitQty: null, deliveryOffset: 1 },
      { title: "사진집 + 엽서 5장", description: "엽서는 이번 쇄 한정", price: 28_000, limitQty: 50, deliveryOffset: 1 },
    ],
  },
  {
    creator: { username: "slow_traveler", name: "느린여행자" },
    title: "기차로 건넌 대륙, 여행 에세이",
    summary: "기차 40일, 12개 도시에서 쓴 여행 에세이",
    description: "비행기 대신 기차를 타고 천천히 건너며 만난 사람들의 이야기입니다.",
    category: "publishing",
    goal: 2_000_000,
    deadlineOffset: 18,
    image: photo("photo-1748016276313-7f9b25de7376"),
    raisedRate: 64,
    rewards: [{ title: "에세이 1권", description: "저자 서명본", price: 18_000, limitQty: null, deliveryOffset: 2 }],
  },
  {
    creator: { username: "band_3am", name: "밴드 새벽세시" },
    title: "소극장 단독 공연 & 라이브 음반",
    summary: "첫 단독 공연을 열고 그날의 소리를 음반으로",
    description: "150석 소극장에서 첫 단독 공연을 엽니다. 공연 실황은 라이브 음반으로 만들어요.",
    category: "music",
    goal: 5_000_000,
    deadlineOffset: 9,
    image: photo("photo-1524368535928-5b5e00ddc76b"),
    raisedRate: 91,
    rewards: [
      { title: "공연 티켓 1매", description: "지정석", price: 35_000, limitQty: 150, deliveryOffset: 1 },
      { title: "티켓 + 라이브 음반", description: "음반은 공연 후 발송", price: 55_000, limitQty: 100, deliveryOffset: 3 },
    ],
  },
  {
    creator: { username: "green_hand", name: "초록손" },
    title: "제로웨이스트 올인원 비누",
    summary: "샴푸·바디·설거지까지 비누 하나로",
    description: "플라스틱 용기 없이 종이 포장만 사용합니다.",
    category: "beauty",
    goal: 2_000_000,
    deadlineOffset: 20,
    image: photo("photo-1607006344152-62699f97b42c"),
    raisedRate: 104,
    rewards: [{ title: "비누 3개 세트", description: "무향·라벤더·쑥", price: 24_000, limitQty: null, deliveryOffset: 1 }],
  },
  // 이미 끝난 프로젝트 (성공·실패 예시)
  {
    creator: { username: "ohneul_workshop", name: "오늘의공방" },
    title: "라탄 컵받침 소량 제작",
    summary: "손으로 엮은 라탄 컵받침 4개 세트",
    description: "공방 첫 펀딩이었어요.",
    category: "living",
    goal: 400_000,
    deadlineOffset: -20,
    image: photo("photo-1506806732259-39c2d0268443"),
    raisedRate: 120,
    rewards: [{ title: "컵받침 4개", description: "지름 10cm", price: 16_000, limitQty: 40, deliveryOffset: -1 }],
  },
  {
    creator: { username: "band_3am", name: "밴드 새벽세시" },
    title: "소규모 인디 공연 음원",
    summary: "데모 5곡을 정식 음원으로",
    description: "목표에 닿지 못했지만 다음 기회에 다시 도전할게요.",
    category: "music",
    goal: 3_000_000,
    deadlineOffset: -25,
    image: photo("photo-1524368535928-5b5e00ddc76b"),
    raisedRate: 64,
    rewards: [{ title: "음원 + 가사집", description: "디지털 다운로드", price: 10_000, limitQty: null, deliveryOffset: -1 }],
  },
];

// ---------- 1. 이전 예시 데이터 지우기 (자식 표부터) ----------
const seedUsers = db.select({ id: user.id }).from(user).where(like(user.email, `%@${SEED_EMAIL_DOMAIN}`));
await db.delete(projectLike).where(inArray(projectLike.userId, seedUsers));
await db.delete(funding).where(inArray(funding.supporterId, seedUsers));
await db.delete(project).where(inArray(project.creatorId, seedUsers)); // 리워드는 cascade 로 함께 지워진다
await db.delete(user).where(like(user.email, `%@${SEED_EMAIL_DOMAIN}`)); // 세션·계정은 cascade
await db.delete(user).where(like(user.email, "%@e2e.moa.test")); // 흐름 테스트가 만든 계정도 정리
console.log("[seed] 이전 예시 데이터를 지웠습니다");

// ---------- 2. 로그인 가능한 계정 (Better Auth 가입 기능 사용 → 비밀번호가 안전하게 저장된다) ----------
async function signUp(username: string, name: string) {
  const res = await auth.api.signUpEmail({
    body: { email: `${username}@${SEED_EMAIL_DOMAIN}`, password: SEED_PASSWORD, name, username },
  });
  return res.user.id;
}

const creatorIds = new Map<string, string>();
for (const p of PROJECTS) {
  if (!creatorIds.has(p.creator.username)) creatorIds.set(p.creator.username, await signUp(p.creator.username, p.creator.name));
}
const loginSupporters = [await signUp("supporter_kim", "김모아"), await signUp("supporter_lee", "이응원"), await signUp("supporter_park", "박후원")];
const adminId = await signUp("moa_admin", "모아 관리자");
await db.update(user).set({ role: "admin" }).where(sql`${user.id} = ${adminId}`);

// 후원 데이터용 사용자 (로그인은 못 하는 예시 사용자 — 비밀번호 없이 표에만 넣는다)
const extraSupporters = Array.from({ length: 60 }, (_, i) => ({
  id: `seed-supporter-${i + 1}`,
  name: `후원자${i + 1}`,
  email: `supporter${i + 1}@${SEED_EMAIL_DOMAIN}`,
}));
await db.insert(user).values(extraSupporters);
const supporterIds = [...loginSupporters, ...extraSupporters.map((u) => u.id)];
console.log(`[seed] 계정 ${creatorIds.size + 4}개(로그인 가능) + 예시 후원자 ${extraSupporters.length}명`);

// ---------- 3. 프로젝트·리워드·후원 ----------
let orderSeq = 0;
for (const p of PROJECTS) {
  const creatorId = creatorIds.get(p.creator.username)!;
  const ended = p.deadlineOffset < 0;
  const [{ id: projectId }] = await db
    .insert(project)
    .values({
      creatorId,
      title: p.title,
      summary: p.summary,
      description: p.description,
      category: p.category,
      goalAmount: p.goal,
      deadline: kstDate(p.deadlineOffset),
      imageUrl: p.image,
      // 이미 끝난 프로젝트는 예약 작업이 확정해 둔 것처럼 상태를 넣는다
      status: ended ? (p.raisedRate >= 100 ? "success" : "failed") : "funding",
    })
    .returning({ id: project.id });

  const rewards = await db
    .insert(reward)
    .values(
      p.rewards.map((r, i) => ({
        projectId,
        title: r.title,
        description: r.description,
        price: r.price,
        limitQty: r.limitQty,
        deliveryMonth: month(r.deliveryOffset),
        sortOrder: i,
      })),
    )
    .returning({ id: reward.id, price: reward.price, limitQty: reward.limitQty });

  // 목표 금액 × 달성률에 닿을 때까지 결제 완료된 후원을 만든다 (리워드를 돌아가며, 한정 수량은 넘지 않게)
  const target = Math.floor((p.goal * p.raisedRate) / 100);
  const sold = new Map<number, number>();
  const rows: (typeof funding.$inferInsert)[] = [];
  let raised = 0;
  let turn = 0;
  while (raised < target) {
    const supporterId = supporterIds[turn % supporterIds.length];
    const r = rewards[turn % rewards.length];
    turn += 1;
    const count = sold.get(r.id) ?? 0;
    const remaining = target - raised;
    const useReward = (r.limitQty === null || count < r.limitQty) && remaining >= r.price;
    const amount = useReward ? r.price : Math.min(Math.max(remaining, 1000), 1_000_000); // 남은 금액은 "리워드 없이 후원"으로
    if (useReward) sold.set(r.id, count + 1);
    orderSeq += 1;
    const paidAt = new Date(Date.now() - (turn % 20) * 24 * 60 * 60 * 1000);
    rows.push({
      projectId,
      supporterId,
      rewardId: useReward ? r.id : null,
      amount,
      orderId: `seed-order-${orderSeq}`,
      paymentKey: `seed-payment-${orderSeq}`,
      status: "paid",
      paidAt,
      createdAt: paidAt,
      message: turn % 5 === 0 ? "늘 응원합니다!" : "",
      recipientName: useReward ? `후원자${turn}` : null,
      recipientPhone: useReward ? "010-0000-0000" : null,
      address: useReward ? "서울특별시 마포구 월드컵로 12길 34" : null,
    });
    raised += amount;
  }
  await db.insert(funding).values(rows);
  for (const [rewardId, count] of sold) {
    await db.update(reward).set({ soldQty: count }).where(sql`${reward.id} = ${rewardId}`);
  }
  console.log(`[seed] ${p.title}: 후원 ${rows.length}건, ${raised.toLocaleString()}원 (${Math.floor((raised / p.goal) * 100)}%)`);
}

// ---------- 4. 찜 (예시 후원자들이 몇 개씩) ----------
const projectIds = (await db.select({ id: project.id }).from(project).where(inArray(project.creatorId, [...creatorIds.values()]))).map((r) => r.id);
const likes = supporterIds.slice(0, 40).flatMap((userId, i) => projectIds.filter((_, j) => (i + j) % 3 === 0).map((projectId) => ({ userId, projectId })));
await db.insert(projectLike).values(likes);
console.log(`[seed] 찜 ${likes.length}건`);

// account 표는 Better Auth가 채운다 (비밀번호 해시). 확인용으로 개수만 출력
const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(account);
console.log(`[seed] 완료 — 로그인 계정 비밀번호: ${SEED_PASSWORD} (예: supporter_kim@${SEED_EMAIL_DOMAIN}), account ${n}개`);
process.exit(0);
