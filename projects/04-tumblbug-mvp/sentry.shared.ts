// Sentry 공통 설정 — 브라우저·서버·Edge 세 곳에서 함께 쓴다.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions = {
  dsn,
  // DSN이 없으면(내 컴퓨터, 아직 Sentry를 만들기 전) 꺼진 채로 동작한다
  enabled: Boolean(dsn),
  // 운영/미리보기/개발 중 어디서 난 에러인지 구분 (Vercel이 값을 넣어 준다)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // 성능 기록은 요청 10개 중 1개만 (무료 사용량 아끼기)
  tracesSampleRate: 0.1,
  // 개인정보는 보내지 않는다 — 11주차에 배송지(이름·연락처·주소)를 다루기 때문.
  // Sentry 11은 기본값이 "대부분 수집"이라 하나씩 꺼 둔다.
  dataCollection: {
    userInfo: false, // 로그인 사용자 정보
    cookies: false, // 로그인 쿠키
    httpBodies: [], // 요청·응답 본문 (폼에 입력한 주소 등)
    databaseQueryData: false, // DB 쿼리에 들어간 값
  },
};
