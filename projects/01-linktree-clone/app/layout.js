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
      </body>
    </html>
  );
}
