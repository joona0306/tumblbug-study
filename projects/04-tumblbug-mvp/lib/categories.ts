// 프로젝트 카테고리. DB에는 영어 값(living)을, 화면에는 한국어 이름(리빙)을 쓴다.
// 주소에도 영어 값이 들어간다: /projects?category=living
export const CATEGORIES = {
  living: "리빙",
  craft: "공예",
  publishing: "출판",
  music: "음악",
  beauty: "뷰티",
  game: "게임",
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_VALUES = Object.keys(CATEGORIES) as Category[];
