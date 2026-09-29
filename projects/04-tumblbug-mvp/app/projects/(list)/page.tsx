import type { Metadata } from "next";
import Link from "next/link";
import { InfiniteProjectGrid } from "@/components/project/InfiniteProjectGrid";
import { Chip } from "@/components/ui/Chip";
import { db } from "@/db";
import { CATEGORIES, type Category } from "@/lib/categories";
import { listProjectsPage } from "@/lib/queries/listing";
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
  // 첫 페이지는 서버에서 — 나머지는 InfiniteProjectGrid 가 스크롤하면 API로 이어서 (9주차)
  const firstPage = await listProjectsPage(db, { ...params, category: params.category as Category | undefined, limit: 12 });

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

      {/* 카드 제목(h3) 앞에 h2 를 둔다 — 제목 단계를 건너뛰지 않게 (20주차 Lighthouse: heading-order). 화면에는 안 보인다 */}
      <h2 className="sr-only">프로젝트 목록</h2>
      <InfiniteProjectGrid key={JSON.stringify(params)} params={params} initialPage={firstPage} nowIso={new Date().toISOString()} />
    </main>
  );
}
