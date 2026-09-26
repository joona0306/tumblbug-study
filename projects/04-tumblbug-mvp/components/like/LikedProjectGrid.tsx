"use client";

import Link from "next/link";
import { ProjectCard } from "@/components/project/ProjectCard";
import grid from "@/components/project/ProjectGrid.module.css";
import { useLikes } from "@/lib/likes-client";
import type { ProjectCardData } from "@/lib/queries/listing";

// 내 찜 목록. 서버가 그린 목록을 "찜 캐시"로 한 번 더 거른다
// → 여기서 하트를 눌러 취소하면 카드가 바로 사라지고, 서버가 실패하면 되돌아온다 (같은 캐시를 보므로)
export function LikedProjectGrid({ projects, nowIso }: { projects: ProjectCardData[]; nowIso: string }) {
  const { data: likes } = useLikes();
  const now = new Date(nowIso);
  const visible = projects.filter((p) => likes?.includes(p.id));

  if (visible.length === 0) {
    return (
      <p className="text-body-m text-muted">
        아직 찜한 프로젝트가 없어요. <Link href="/projects">프로젝트 둘러보기</Link>
      </p>
    );
  }
  return (
    <div className={grid.grid}>
      {visible.map((p, i) => (
        <ProjectCard key={p.id} project={p} now={now} compact priority={i < 4} />
      ))}
    </div>
  );
}
