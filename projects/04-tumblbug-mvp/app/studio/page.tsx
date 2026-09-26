import type { Metadata } from "next";
import Link from "next/link";
import { DailyChart, RewardTable, SummaryCards, SupporterTable } from "@/components/studio/Dashboard";
import { RecentFundings } from "@/components/studio/RecentFundings";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/db";
import { getDailyRaised, getDashboardSummary, getRewardBreakdown, listSupporters } from "@/lib/queries/dashboard";
import { listMyProjects, listRecentFundings } from "@/lib/queries/studio";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "창작자 스튜디오 — 모아" };

type Props = { searchParams: Promise<{ project?: string }> };

// 창작자 스튜디오 (/studio) = 창작자 대시보드 (Figma D03)
//  12주차: 내 프로젝트 고르기 + 새 후원 자동 확인 / 13주차: 모금 현황(SQL 집계)·날짜별 모금·리워드별 판매·후원자·배송지
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
  // 서로 기다릴 필요 없는 조회는 동시에 보낸다 (Promise.all) → 가장 느린 하나만큼만 걸린다
  const [initial, summary, days, breakdown, supporters] = await Promise.all([
    listRecentFundings(db, selected.id),
    getDashboardSummary(db, selected.id),
    getDailyRaised(db, selected.id),
    getRewardBreakdown(db, selected.id),
    listSupporters(db, selected.id),
  ]);

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)", paddingBlock: "var(--spacing-xl) var(--spacing-3xl)", maxWidth: 880 }}>
      <h1 className="text-heading-l">창작자 스튜디오</h1>
      <nav aria-label="내 프로젝트" style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
        {projects.map((p) => (
          <Chip key={p.id} href={`/studio?project=${p.id}`} selected={p.id === selected.id}>
            {p.title}
            {p.hidden && " (숨김)"}
          </Chip>
        ))}
      </nav>
      <p className="text-body-s">
        <Link href={`/projects/${selected.id}`}>프로젝트 페이지 보기</Link> · <Link href={`/projects/${selected.id}/edit`}>수정하기</Link>
      </p>
      {/* key: 프로젝트를 바꾸면 새로 그린다 (본 것 표시·강조가 섞이지 않게) */}
      {summary && <SummaryCards summary={summary} />}
      <DailyChart days={days} />
      <RecentFundings key={selected.id} projectId={selected.id} initial={initial} />
      <RewardTable breakdown={breakdown} />
      <SupporterTable supporters={supporters} />
    </main>
  );
}
