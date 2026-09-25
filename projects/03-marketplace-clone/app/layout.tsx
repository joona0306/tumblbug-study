import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "동네 마켓",
  description: "동네 중고거래 서비스",
};

// children: 이 레이아웃 안에 들어갈 각 페이지의 내용. React가 그릴 수 있는 무엇이든(ReactNode) 올 수 있다.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <main className="container">{children}</main>
        {/* 방문 기록(페이지뷰)을 Vercel에 보낸다. 내 컴퓨터(개발 모드)에서는 보내지 않는다 */}
        <Analytics />
      </body>
    </html>
  );
}
