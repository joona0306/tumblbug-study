import grid from "@/components/project/ProjectGrid.module.css";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

// 프로젝트 목록을 불러오는 동안: 제목·필터·카드 8장 모양의 뼈대
export default function ProjectsLoading() {
  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)", paddingBlock: "var(--spacing-xl)" }}>
      <p className="sr-only" role="status">
        프로젝트를 불러오는 중…
      </p>
      <Skeleton width={200} height={28} />
      <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width={64} height={36} radius="var(--radius-full)" />
        ))}
      </div>
      <div className={grid.grid}>
        {Array.from({ length: 8 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
