import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "페이지를 찾을 수 없어요 — 모아" };

// 없는 주소·숨긴 프로젝트·권한이 없는 관리자 화면에서 notFound() 를 부르면 이 화면 (Next.js 규칙 파일)
// 권한이 없을 때도 "없음"으로 보여 준다 — 그런 페이지가 있다는 사실 자체를 알리지 않기 위해
export default function NotFound() {
  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-md)", paddingBlock: "var(--spacing-3xl)", textAlign: "center" }}>
      <SearchX size={48} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
      <h1 className="text-heading-l">페이지를 찾을 수 없어요</h1>
      <p className="text-body-m text-muted">주소가 바뀌었거나, 비공개로 바뀐 프로젝트일 수 있어요.</p>
      <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
        <ButtonLink href="/projects">프로젝트 둘러보기</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          홈으로
        </ButtonLink>
      </div>
    </main>
  );
}
