import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Proxy (Next.js 16에서 middleware 가 proxy 로 이름이 바뀜): 페이지를 그리기 "전에" 요청을 먼저 받는 문지기.
// 로그인이 필요한 주소에 로그인 쿠키 없이 오면, 로그인 화면으로 보내면서 돌아올 주소를 붙인다.
//
// ⚠️ 여기서는 쿠키가 "있는지"만 본다 (빠르게, DB 없이). 쿠키가 있어도 만료·위조일 수 있으므로
//    진짜 확인은 각 페이지·서버 액션의 requireUser() 가 한다. proxy 는 편의, requireUser 는 보안.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(loginUrl);
}

// 이 주소들에서만 실행된다 (나머지 페이지·이미지·CSS 요청에는 끼어들지 않는다)
export const config = {
  matcher: ["/projects/new", "/projects/:id/edit", "/projects/:id/fund", "/studio/:path*", "/me/:path*", "/admin/:path*"],
};
