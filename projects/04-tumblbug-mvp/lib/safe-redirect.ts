// 로그인 후 "원래 보던 곳"으로 돌려보낼 때 쓰는 주소 검사.
// /login?redirect=https://나쁜사이트.com 처럼 바깥 주소를 넣어 사용자를 다른 사이트로 보내는 공격(오픈 리다이렉트)을 막는다.
// 우리 사이트 안의 경로("/"로 시작)만 허용하고, 그 밖에는 기본 주소로 보낸다.
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  // "//evil.com" 은 브라우저가 "https://evil.com" 으로 해석한다 → 막는다. "/\evil.com" 도 같은 이유
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
