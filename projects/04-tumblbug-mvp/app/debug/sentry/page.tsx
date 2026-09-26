import type { Metadata } from "next";
import { ThrowButton } from "./ThrowButton";

// Sentry 연결 확인용 화면. 버튼을 누르면 일부러 에러를 내고, Sentry 대시보드에 기록되는지 본다.
export const metadata: Metadata = {
  title: "Sentry 확인 — 모아",
  robots: { index: false },
};

export default function SentryCheckPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--spacing-3xl)", display: "grid", gap: "var(--spacing-lg)" }}>
      <h1 className="text-heading-l">Sentry 연결 확인</h1>
      <p className="text-body-s text-muted">
        아래 버튼으로 일부러 에러를 냅니다. 1~2분 뒤 Sentry 대시보드의 Issues에 나타나면 연결 성공입니다.
      </p>
      <ThrowButton />
      <a href="/api/debug/sentry">서버에서 테스트 에러 내기 (/api/debug/sentry)</a>
    </main>
  );
}
