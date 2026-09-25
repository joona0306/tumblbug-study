import { desc, eq, ilike } from "drizzle-orm";
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

// LIKE 검색에서 %(아무 글자 여러 개), _(아무 글자 하나)는 특별한 뜻이 있다.
// 사용자가 "100%" 를 검색하면 글자 그대로 찾도록 앞에 \ 를 붙여 "그냥 글자"로 만든다.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export type ProductFilter = {
  q?: string; // 검색어
};

// 조건에 맞는 최신 상품 목록
export async function listProducts(filter: ProductFilter = {}) {
  const q = filter.q?.trim();

  return db
    .select(cardColumns)
    .from(product)
    .innerJoin(user, eq(product.userId, user.id))
    // ilike: 대소문자를 구분하지 않는 "포함" 검색. 검색어가 없으면 조건 없음(undefined)
    .where(q ? ilike(product.title, `%${escapeLike(q)}%`) : undefined)
    .orderBy(desc(product.createdAt))
    .limit(LIST_LIMIT);
}

// 목록 한 줄의 타입을 함수의 결과에서 뽑아낸다.
// Awaited: Promise 를 벗긴 결과 / [number]: 배열의 한 칸
export type ProductCardData = Awaited<ReturnType<typeof listProducts>>[number];
