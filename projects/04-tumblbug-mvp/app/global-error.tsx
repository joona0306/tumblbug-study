"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

// 앱 전체가 멈출 만큼 큰 에러가 났을 때 보여주는 마지막 화면 (Next.js 규칙 파일).
// 이 화면은 layout 대신 그려지므로 <html>, <body>를 직접 쓴다.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="container" style={{ paddingBlock: "var(--spacing-3xl)" }}>
          <h1 className="text-heading-l">문제가 생겼어요</h1>
          <p className="text-body-m text-muted" style={{ marginBlock: "var(--spacing-md) var(--spacing-xl)" }}>
            잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 알려 주세요.
          </p>
          <button type="button" onClick={reset}>
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
