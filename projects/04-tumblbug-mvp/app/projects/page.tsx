import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/project/ProjectCard";
import grid from "@/components/project/ProjectGrid.module.css";
import { Chip } from "@/components/ui/Chip";
import { db } from "@/db";
import { CATEGORIES, type Category } from "@/lib/categories";
import { listProjects } from "@/lib/queries/listing";
import { listHref, listParamsSchema } from "@/lib/validation/list-params";
import styles from "./projects.module.css";

export const metadata: Metadata = { title: "프로젝트 둘러보기 — 모아" };

const STATUS_TABS = [
  ["funding", "모금중"],
  ["success", "성공"],
  ["failed", "실패"],
] as const;
const SORTS = [
  ["deadline", "마감 임박순"],
  ["popular", "인기순"],
  ["new", "최신순"],
] as const;

// 목록 (Figma M02): 필터·정렬은 모두 주소(URL)에 담긴다 → 새로고침·공유·뒤로가기해도 그대로 (상태 관리 지도: URL 상태)
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = listParamsSchema.parse(await searchParams);
  const projects = await listProjects(db, { ...params, category: params.category as Category | undefined, limit: 24 });
  const now = new Date();

  return (
    <main className={`container ${styles.page}`}>
      <h1 className="text-heading-l">프로젝트 둘러보기</h1>

      <nav className={styles.chips} aria-label="카테고리">
        <Chip href={listHref(params, { category: undefined })} selected={!params.category}>
          전체
        </Chip>
        {Object.entries(CATEGORIES).map(([value, label]) => (
          <Chip key={value} href={listHref(params, { category: value })} selected={params.category === value}>
            {label}
          </Chip>
        ))}
      </nav>

      <div className={styles.bar}>
        <nav className={styles.tabs} aria-label="모금 상태">
          {STATUS_TABS.map(([value, label]) => (
            <Link key={value} href={listHref(params, { status: value })} aria-current={params.status === value ? "page" : undefined} className={styles.tab}>
              {label}
            </Link>
          ))}
        </nav>
        <nav className={styles.sorts} aria-label="정렬">
          {SORTS.map(([value, label]) => (
            <Link key={value} href={listHref(params, { sort: value })} aria-current={params.sort === value ? "page" : undefined} className={styles.sort}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="text-caption text-muted">{projects.length}개 프로젝트</p>
      {projects.length === 0 ? (
        <p className={grid.empty}>조건에 맞는 프로젝트가 없어요.</p>
      ) : (
        <div className={grid.grid}>
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} now={now} compact priority={i < 4} />
          ))}
        </div>
      )}
    </main>
  );
}
