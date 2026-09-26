"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { ProjectCardData } from "@/lib/queries/listing";
import { ProjectCard } from "./ProjectCard";
import grid from "./ProjectGrid.module.css";

type Page = { items: ProjectCardData[]; nextCursor: string | null };
type Params = { category?: string; status: string; sort: string };

const PAGE_SIZE = 12;

// 다음 페이지를 API에서 가져온다. 실패하면 이유를 담아 던진다 (TanStack Query 가 받아서 error 상태로)
async function fetchPage(params: Params, cursor: string | null): Promise<Page> {
  const query = new URLSearchParams({ status: params.status, sort: params.sort, limit: String(PAGE_SIZE) });
  if (params.category) query.set("category", params.category);
  if (cursor) query.set("cursor", cursor);
  const res = await fetch(`/api/projects?${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "목록을 불러오지 못했어요");
  }
  return res.json();
}

// 목록 무한 스크롤 (9주차).
//  - 첫 페이지는 서버가 그려서 넘겨준다(initialPage) → 화면이 바로 보이고, 같은 데이터를 두 번 받지 않는다
//  - 끝에 닿으면 다음 페이지를 API로 이어서 가져온다
export function InfiniteProjectGrid({ params, initialPage, nowIso }: { params: Params; initialPage: Page; nowIso: string }) {
  const now = new Date(nowIso); // 서버와 같은 "지금"으로 그려야 서버·브라우저 결과가 어긋나지 않는다
  const query = useInfiniteQuery({
    queryKey: ["projects", params], // 조건이 다르면 다른 기억 칸
    queryFn: ({ pageParam }) => fetchPage(params, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor, // null 이면 "더 없음"
    initialData: { pages: [initialPage], pageParams: [null] },
  });

  // 목록 끝의 보이지 않는 표시(sentinel)가 화면에 들어오면 다음 페이지를 부른다
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: "400px" }); // 끝에 닿기 조금 전에 미리
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const projects = query.data.pages.flatMap((p) => p.items);
  if (projects.length === 0) return <p className={grid.empty}>조건에 맞는 프로젝트가 없어요.</p>;

  return (
    <>
      <div className={grid.grid}>
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} now={now} compact priority={i < 4} />
        ))}
      </div>
      <div ref={sentinel} aria-hidden="true" />
      <div className={grid.more}>
        {query.isFetchNextPageError ? (
          <>
            <p role="alert" className="text-body-s">
              {query.error?.message}
            </p>
            <Button variant="secondary" size="m" onClick={() => fetchNextPage()}>
              다시 시도
            </Button>
          </>
        ) : hasNextPage ? (
          // 스크롤 대신 키보드·화면 낭독기로도 더 볼 수 있게 버튼을 함께 둔다
          <Button variant="secondary" size="m" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </Button>
        ) : (
          projects.length > PAGE_SIZE && <p className="text-caption text-muted">모든 프로젝트를 봤어요</p>
        )}
      </div>
    </>
  );
}
