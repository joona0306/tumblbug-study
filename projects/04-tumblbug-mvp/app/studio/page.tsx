import type { Metadata } from "next";
import Link from "next/link";
import { RecentFundings } from "@/components/studio/RecentFundings";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/db";
import { listMyProjects, listRecentFundings } from "@/lib/queries/studio";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "창작자 스튜디오 — 모아" };

type Props = { searchParams: Promise<{ project?: string }> };

// 창작자 스튜디오 (/studio) — 12주차: 내 프로젝트 고르기 + 새 후원 자동 확인
// 13주차에 모금 현황(SQL 집계)·후원자·배송지 목록을 더해 대시보드로 키운다
export default async function StudioPage({ searchParams }: Props) {
  const me = await requireUser("/studio");
  const projects = await listMyProjects(db, me.id);

  if (projects.length === 0) {
    return (
      <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)", paddingBlock: "var(--spacing-xl)" }}>
        <h1 className="text-heading-l">창작자 스튜디오</h1>
        <p className="text-body-m text-muted">아직 만든 프로젝트가 없어요.</p>
        <ButtonLink href="/projects/new">첫 프로젝트 만들기</ButtonLink>
      </main>
    );
  }

  // 고른 프로젝트는 주소(?project=)에 둔다 (URL 상태 — 새로고침·공유해도 유지). 잘못된 값이면 첫 프로젝트
  const requested = Number((await searchParams).project);
  const selected = projects.find((p) => p.id === requested) ?? projects[0];
  const initial = await listRecentFundings(db, selected.id);

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)", paddingBlock: "var(--spacing-xl) var(--spacing-3xl)", maxWidth: 720 }}>
      <h1 className="text-heading-l">창작자 스튜디오</h1>
      <nav aria-label="내 프로젝트" style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
        {projects.map((p) => (
          <Chip key={p.id} href={`/studio?project=${p.id}`} selected={p.id === selected.id}>
            {p.title}
          </Chip>
        ))}
      </nav>
      <p className="text-body-s">
        <Link href={`/projects/${selected.id}`}>프로젝트 페이지 보기</Link> · <Link href={`/projects/${selected.id}/edit`}>수정하기</Link>
      </p>
      {/* key: 프로젝트를 바꾸면 새로 그린다 (본 것 표시·강조가 섞이지 않게) */}
      <RecentFundings key={selected.id} projectId={selected.id} initial={initial} />
    </main>
  );
}
