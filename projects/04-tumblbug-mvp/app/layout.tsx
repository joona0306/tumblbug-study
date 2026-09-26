import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// Figma와 같은 글꼴. 빌드할 때 한 번 내려받아 우리 서버에서 함께 보낸다 (방문자는 구글에 따로 요청하지 않음)
const notoSansKr = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "모아 — 작은 응원이 모여 창작이 돼요",
  description: "창작자의 프로젝트를 후원하는 크라우드펀딩 서비스 (교재 예시)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body>{children}</body>
    </html>
  );
}
