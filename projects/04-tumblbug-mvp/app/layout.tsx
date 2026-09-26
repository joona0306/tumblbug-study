import type { Metadata } from "next";
// Figma와 같은 글꼴(Noto Sans KR). npm 패키지로 설치해 우리 서버에서 함께 보낸다.
// 빌드할 때 구글 서버에 접속하지 않아도 되므로 CI에서도 안정적이다. (한국어 글꼴은 조각 파일이 많아 내려받기가 자주 실패한다)
import "@fontsource-variable/noto-sans-kr";
import { AppHeader } from "@/components/layout/AppHeader";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "모아 — 작은 응원이 모여 창작이 돼요",
  description: "창작자의 프로젝트를 후원하는 크라우드펀딩 서비스 (교재 예시)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <AppHeader />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
