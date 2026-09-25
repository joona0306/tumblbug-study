import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { product, user } from "@/db/schema";

const LIST_LIMIT = 60; // 첫 화면에 보여줄 최대 개수 (페이지 나누기는 이번 범위에서 제외)

// 목록 카드에 필요한 칸만 고른다
const cardColumns = {
  id: product.id,
  title: product.title,
  price: product.price,
  status: product.status,
  imageUrl: product.imageUrl,
  category: product.category,
  sellerName: user.username,
};

// 최신 상품 목록
export async function listProducts() {
  return db
    .select(cardColumns)
    .from(product)
    .innerJoin(user, eq(product.userId, user.id))
    .orderBy(desc(product.createdAt))
    .limit(LIST_LIMIT);
}

// 목록 한 줄의 타입을 함수의 결과에서 뽑아낸다.
// Awaited: Promise 를 벗긴 결과 / [number]: 배열의 한 칸
export type ProductCardData = Awaited<ReturnType<typeof listProducts>>[number];
