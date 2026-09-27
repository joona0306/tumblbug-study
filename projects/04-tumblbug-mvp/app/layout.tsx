import type { Metadata } from "next";
// Figma와 같은 글꼴(Noto Sans KR). npm 패키지로 설치해 우리 서버에서 함께 보낸다.
// 빌드할 때 구글 서버에 접속하지 않아도 되므로 CI에서도 안정적이다. (한국어 글꼴은 조각 파일이 많아 내려받기가 자주 실패한다)
import "@fontsource-variable/noto-sans-kr";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { db } from "@/db";
import { LIKES_KEY, type LikesData } from "@/lib/likes-key";
import { getMyLikeIds } from "@/lib/queries/likes";
import { getCurrentUser } from "@/lib/session";
import { parseTheme, THEME_COOKIE, themeAttribute } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "모아 — 작은 응원이 모여 창작이 돼요",
  description: "창작자의 프로젝트를 후원하는 크라우드펀딩 서비스 (교재 예시)",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 찜 목록의 첫 값을 서버에서 채워 보낸다 (TanStack Query hydration).
  // 서버에서 만든 캐시를 dehydrate(글자로 바꿈) → 브라우저의 HydrationBoundary 가 다시 캐시로 되살린다
  // → 첫 화면부터 하트가 채워져 있고, 브라우저가 /api/likes 를 따로 부를 때까지 기다리지 않는다
  const user = await getCurrentUser();
  const queryClient = new QueryClient();
  queryClient.setQueryData<LikesData>(LIKES_KEY, user ? await getMyLikeIds(db, user.id) : null);

  // 마이페이지에서 고른 화면 테마 (쿠키). "시스템"이면 data-theme 없이 → CSS 가 기기 설정을 따른다
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang="ko" data-theme={themeAttribute(theme)}>
      <body>
        <QueryProvider>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <ToastProvider>
              <AppHeader />
              {children}
            </ToastProvider>
          </HydrationBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
