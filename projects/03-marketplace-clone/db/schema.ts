import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// 로그인에 필요한 표(user, session, account, verification)는
// Better Auth CLI가 만들어준 auth-schema.ts 에 있다. 여기서 한 번에 내보낸다.
export * from "./auth-schema";

// 상품 1개 = product 표의 1줄. 사용자(판매자) 1명은 상품을 여러 개 올린다 (user 1 : N product)
export const product = pgTable(
  "product",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    price: integer("price").notNull(), // 원 단위. 0이면 "나눔"
    category: text("category").notNull(),
    description: text("description").notNull().default(""),
    // enum: 이 칸에 들어갈 수 있는 값을 TypeScript 타입으로도 제한한다 ("selling" 또는 "sold"만)
    status: text("status", { enum: ["selling", "sold"] }).notNull().default("selling"),
    imageUrl: text("image_url").notNull(), // 사진이 저장된 Vercel Blob 주소
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("product_userId_idx").on(table.userId)],
);

// 표 설계도에서 타입을 뽑아낸다. 직접 타입을 다시 적을 필요가 없다.
export type Product = typeof product.$inferSelect; // DB에서 꺼낸 상품 1개의 모양
export type ProductStatus = Product["status"]; // "selling" | "sold"
