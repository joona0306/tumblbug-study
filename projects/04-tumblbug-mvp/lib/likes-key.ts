// 찜 캐시의 이름표(queryKey) — 서버(레이아웃이 첫 값을 채움)와 브라우저(useLikes)가 같은 이름을 써야 해서 따로 둔다
export const LIKES_KEY = ["likes"] as const;

// 내가 찜한 프로젝트 번호들. null = 로그인하지 않음
export type LikesData = number[] | null;
