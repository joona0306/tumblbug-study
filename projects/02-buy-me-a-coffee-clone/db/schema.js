import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// 로그인에 필요한 표(user, session, account, verification)는
// Better Auth CLI가 만들어준 auth-schema.js 에 있다. 여기서 한 번에 내보낸다.
export * from "./auth-schema";

// 후원 1건 = support 표의 1줄. 크리에이터(user) 1명은 후원을 여러 건 받는다 (1 : N)
export const support = pgTable(
  "support",
  {
    id: serial("id").primaryKey(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    supporterName: text("supporter_name").notNull(), // 후원자 이름 (비우면 "익명")
    amount: integer("amount").notNull(), // 서버가 정한 금액 (원)
    message: text("message").notNull().default(""),
    // 토스페이먼츠와 주고받는 값
    orderId: text("order_id").notNull().unique(), // 우리가 만든 주문 번호
    paymentKey: text("payment_key"), // 결제가 끝나면 토스가 알려주는 결제 번호
    // 결제 상태: pending(결제 진행 중) → paid(완료) 또는 failed(실패·취소)
    status: text("status").notNull().default("pending"),
    failReason: text("fail_reason"), // 실패했다면 그 이유 (운영할 때 원인 추적용)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    paidAt: timestamp("paid_at"),
  },
  (table) => [index("support_creatorId_idx").on(table.creatorId)],
);
