import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { CATEGORY_VALUES } from "@/lib/categories";
import { user } from "./auth-schema";

// 표 설계도 = 물리 ERD를 코드로 (templates/07-data-model.md ③).
// 시각 칸은 모두 timestamptz(시간대 포함)로 저장한다 — DB 서버는 UTC, 사용자는 한국 시간이라 어긋나지 않게.
// 규칙은 되도록 DB에도 새긴다(CHECK·UNIQUE·외래 키). 앱 코드에 버그가 있어도 DB가 마지막으로 막아 준다.
// 로그인에 필요한 표(user, session, account, verification)는 Better Auth CLI가 만든 auth-schema.ts 에 있다.
export * from "./auth-schema";

// 값 목록을 SQL CHECK 조건 글자로 바꾼다: ['a','b'] → 'a','b'
const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(","));

export const PROJECT_STATUSES = ["funding", "success", "failed"] as const;
export const FUNDING_STATUSES = ["pending", "paid", "failed"] as const;

// 프로젝트: 사용자(창작자) 1 : N 프로젝트
export const project = pgTable(
  "project",
  {
    id: serial("id").primaryKey(),
    // 창작자가 탈퇴하려 해도 프로젝트가 있으면 막는다 (restrict) — 후원 기록이 딸려 있기 때문
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull().default(""),
    category: text("category", { enum: CATEGORY_VALUES as [string, ...string[]] }).notNull(),
    goalAmount: integer("goal_amount").notNull(), // 원 단위 정수 (소수점 오차 없음)
    // 마감일(날짜만). 실제 마감 시각은 "이 날짜의 23:59:59 한국 시간" — 계산은 코드에서 (8주차 getProjectStatus)
    deadline: date("deadline", { mode: "string" }).notNull(),
    imageUrl: text("image_url").notNull(),
    // 확정 상태: 매일 예약 작업이 마감된 프로젝트를 success/failed 로 확정한다 (13주차). 화면은 항상 계산값을 쓴다 (ADR-001)
    status: text("status", { enum: PROJECT_STATUSES }).notNull().default("funding"),
    hidden: boolean("hidden").notNull().default(false), // 관리자가 숨긴 프로젝트
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("project_creator_idx").on(t.creatorId),
    // 목록: "모금 중인 것만, 마감 임박순" — 거르는 칸(status)을 앞에, 정렬하는 칸(deadline)을 뒤에 (6주차 6단계)
    index("project_status_deadline_idx").on(t.status, t.deadline),
    check("project_category_check", sql`${t.category} in (${inList(CATEGORY_VALUES)})`),
    check("project_status_check", sql`${t.status} in (${inList(PROJECT_STATUSES)})`),
    check("project_goal_check", sql`${t.goalAmount} between 10000 and 100000000`),
  ],
);

// 리워드: 프로젝트 1 : N 리워드
export const reward = pgTable(
  "reward",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    price: integer("price").notNull(),
    limitQty: integer("limit_qty"), // 비어 있으면(NULL) 무제한
    soldQty: integer("sold_qty").notNull().default(0),
    deliveryMonth: date("delivery_month", { mode: "string" }).notNull(), // 전달 예정 달 (1일로 저장)
    needsShipping: boolean("needs_shipping").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("reward_project_idx").on(t.projectId),
    check("reward_price_check", sql`${t.price} between 1000 and 1000000`),
    check("reward_limit_check", sql`${t.limitQty} is null or ${t.limitQty} > 0`),
    // ⭐ 초과 판매 방지의 마지막 방어선: 판매 수량은 한정 수량을 넘을 수 없다 (ADR-003)
    check("reward_sold_check", sql`${t.soldQty} >= 0 and (${t.limitQty} is null or ${t.soldQty} <= ${t.limitQty})`),
  ],
);

// 후원: 사용자(후원자) 1 : N 후원, 프로젝트 1 : N 후원, 리워드 1 : N 후원(0~1개)
export const funding = pgTable(
  "funding",
  {
    id: serial("id").primaryKey(),
    // 후원(결제) 기록은 지우면 안 되므로 restrict — 프로젝트·사용자·리워드가 먼저 지워지는 것을 막는다
    projectId: integer("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
    supporterId: text("supporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    rewardId: integer("reward_id").references(() => reward.id, { onDelete: "restrict" }), // NULL = 리워드 없이 후원
    quantity: integer("quantity").notNull().default(1),
    extraAmount: integer("extra_amount").notNull().default(0), // 추가 후원금
    amount: integer("amount").notNull(), // 총액 = 리워드 가격 × 수량 + 추가 후원금 (서버가 계산)
    message: text("message").notNull().default(""),
    // 배송지 (개인정보 — 결제 완료 후 해당 프로젝트 창작자에게만 보여준다)
    recipientName: text("recipient_name"),
    recipientPhone: text("recipient_phone"),
    address: text("address"),
    orderId: text("order_id").notNull().unique(), // 토스페이먼츠 주문 번호 (우리가 만든다)
    paymentKey: text("payment_key").unique(), // 토스페이먼츠가 준 결제 키 (결제 승인 후)
    status: text("status", { enum: FUNDING_STATUSES }).notNull().default("pending"),
    failReason: text("fail_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("funding_supporter_idx").on(t.supporterId),
    // 모인 금액·후원자 수: "이 프로젝트의 결제 완료 후원" — 가장 자주 쓰는 조건 (6주차 6단계)
    index("funding_project_status_idx").on(t.projectId, t.status),
    check("funding_status_check", sql`${t.status} in (${inList(FUNDING_STATUSES)})`),
    check("funding_amount_check", sql`${t.amount} between 1000 and 1000000`),
    check("funding_quantity_check", sql`${t.quantity} between 1 and 5`),
    check("funding_extra_check", sql`${t.extraAmount} >= 0`),
    // 결제 완료라면 결제 키와 완료 시각이 반드시 있어야 한다
    check("funding_paid_check", sql`${t.status} <> 'paid' or (${t.paymentKey} is not null and ${t.paidAt} is not null)`),
  ],
);

// 찜: 사용자 N : M 프로젝트 → 연결 표. 두 칸을 합친 것이 기본 키 = 같은 프로젝트를 두 번 찜할 수 없다
export const projectLike = pgTable(
  "project_like",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectId] }), index("project_like_project_idx").on(t.projectId)],
);

// 결제 웹훅 기록 (11주차): 토스가 보낸 알림을 그대로 남긴다. event_id UNIQUE = 같은 알림을 두 번 처리하지 않는다
export const paymentEvent = pgTable("payment_event", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  orderId: text("order_id").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

// 요청 수 제한 기록 (9주차): "이 키(예: IP+API)가 이 시간 칸(1분)에 몇 번 요청했나"
// 서버리스는 서버가 여러 대로 나뉘어 돌아서 메모리로는 셀 수 없다 → 모두가 보는 DB에 센다
export const rateLimit = pgTable(
  "rate_limit",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

// 퍼널 기록 (15주차) — "상세를 본 사람 중 몇 명이 후원까지 갔나, 어디서 가장 많이 빠지나" (PLAN 성공 지표)
// 한 방문자(visitor_id)가 한 프로젝트에서 각 단계에 처음 도착한 순간만 남긴다 (새로고침해도 한 번)
// 개인정보 없음: visitor_id 는 브라우저 쿠키의 무작위 값 — 로그인 계정·IP·기기 정보와 연결하지 않는다
export const FUNNEL_STEPS = ["view", "reward", "shipping", "payment_request", "paid"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const funnelEvent = pgTable(
  "funnel_event",
  {
    visitorId: text("visitor_id").notNull(),
    projectId: integer("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    step: text("step", { enum: FUNNEL_STEPS }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // 기본 키 = 같은 사람·같은 프로젝트·같은 단계는 한 줄만 (INSERT ... ON CONFLICT DO NOTHING)
    primaryKey({ columns: [t.visitorId, t.projectId, t.step] }),
    // 퍼널 집계: "최근 N일, 단계별" 로 거른다
    index("funnel_event_created_idx").on(t.createdAt),
    check("funnel_event_step_check", sql`${t.step} in (${inList(FUNNEL_STEPS)})`),
  ],
);
