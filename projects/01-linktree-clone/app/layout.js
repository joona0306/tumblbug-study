import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata = {
  title: "My Links",
  description: "여러 링크를 한 페이지에 모아 보여주는 서비스",
};

export default function RootLayout({ children }) {
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
