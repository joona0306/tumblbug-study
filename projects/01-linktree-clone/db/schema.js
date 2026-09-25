import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// 로그인에 필요한 표(user, session, account, verification)는
// Better Auth CLI가 만들어준 auth-schema.js 에 있다. 여기서 한 번에 내보낸다.
export * from "./auth-schema";

// 우리가 직접 설계한 표: 사용자 한 명이 여러 개의 링크를 가진다 (user 1 : N link)
export const link = pgTable(
  "link",
  {
    id: serial("id").primaryKey(), // 1, 2, 3... 자동으로 늘어나는 번호
    userId: text("user_id")
      .notNull()
      // 이 링크의 주인. user 표의 id를 가리킨다. 사용자가 탈퇴하면 링크도 함께 삭제
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    // 화면에 보여줄 순서. "order"는 SQL 예약어(ORDER BY)라서 position 이라는 이름을 쓴다
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  // "이 사용자의 링크 목록"을 자주 찾으므로 user_id 에 색인(index)을 달아 빠르게 찾게 한다
  (table) => [index("link_userId_idx").on(table.userId)],
);
