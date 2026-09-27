"use server";

import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

// 화면 테마 저장 (마이페이지). 쿠키에 1년 동안 저장한다
// 서버 액션에서 쿠키를 바꾸면 Next.js 가 지금 화면을 서버에서 다시 그려 준다 → 레이아웃의 <html data-theme> 이 바로 바뀐다
export async function setTheme(value: Theme) {
  const theme = parseTheme(value); // 브라우저가 보낸 값은 한 번 더 검사
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true, // 브라우저 코드가 읽을 필요가 없다 (서버만 읽는다)
    secure: process.env.NODE_ENV === "production",
  });
}
