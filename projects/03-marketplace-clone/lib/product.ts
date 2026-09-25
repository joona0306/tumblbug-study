import type { ProductStatus } from "@/db/schema";

// 상품 규칙을 한곳에 모아둔다. (화면과 서버가 같은 값을 쓰도록)

// as const: "이 배열은 바뀌지 않는다"는 표시. 덕분에 아래 Category 타입이 정확한 글자 목록이 된다.
export const CATEGORIES = ["디지털기기", "가구/인테리어", "의류", "도서", "생활가전", "기타"] as const;
export type Category = (typeof CATEGORIES)[number]; // "디지털기기" | "가구/인테리어" | ... | "기타"

export const TITLE_MAX_LENGTH = 40;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const PRICE_MAX = 100_000_000; // 1억 원

// Record<ProductStatus, string>: "selling"과 "sold" 둘 다 빠짐없이 적어야 한다 (하나라도 빠지면 타입 에러)
export const STATUS_LABELS: Record<ProductStatus, string> = {
  selling: "판매중",
  sold: "거래완료",
};

// 문자열이 정해진 카테고리 중 하나인지 검사한다.
// 반환 타입 "value is Category": true 이면 TypeScript 가 그 뒤부터 value 를 Category 로 취급한다.
export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

// 문자열이 정해진 판매 상태 중 하나인지 검사한다.
// 주의: "value in STATUS_LABELS" 로 쓰면 "toString" 처럼 모든 객체가 물려받는 이름도 통과한다.
// Object.hasOwn 은 이 객체에 직접 적은 키(selling, sold)만 인정한다.
export function isProductStatus(value: string): value is ProductStatus {
  return Object.hasOwn(STATUS_LABELS, value);
}

// 12000 → "12,000원", 0 → "나눔 🧡"
export function formatPrice(price: number): string {
  return price === 0 ? "나눔 🧡" : `${price.toLocaleString("ko-KR")}원`;
}
