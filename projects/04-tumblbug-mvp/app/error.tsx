"use client";

import * as Sentry from "@sentry/nextjs";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

// 페이지를 그리다 에러가 나면 보여 주는 화면 (Next.js 규칙 파일). 헤더는 그대로 두고 본문만 바뀐다.
// (global-error.tsx 는 레이아웃까지 망가졌을 때의 마지막 화면)
//  - 에러 내용은 사용자에게 보여 주지 않는다 (내부 정보가 새지 않게) → Sentry 로 보내고, 문의용 번호(digest)만 보여 준다
//  - reset(): 이 부분만 다시 그려 본다 (일시적인 DB·네트워크 문제면 대부분 해결된다)
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-md)", paddingBlock: "var(--spacing-3xl)", textAlign: "center" }}>
      <CircleAlert size={48} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
      <h1 className="text-heading-l">화면을 불러오지 못했어요</h1>
      <p className="text-body-m text-muted">잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 아래 번호와 함께 알려 주세요.</p>
      {error.digest && <p className="text-caption text-muted">오류 번호: {error.digest}</p>}
      <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
        <Button onClick={reset}>다시 시도</Button>
        <Link href="/" className="text-body-m" style={{ alignSelf: "center" }}>
          홈으로
        </Link>
      </div>
    </main>
  );
}
