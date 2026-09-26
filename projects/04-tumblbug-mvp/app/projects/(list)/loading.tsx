import grid from "@/components/project/ProjectGrid.module.css";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

// 프로젝트 목록을 불러오는 동안: 제목·필터·카드 8장 모양의 뼈대
//
// 왜 (list) 폴더 안에 있나 — loading.tsx 는 "같은 폴더와 그 아래 모든 페이지"를 스트리밍으로 바꾼다.
// 스트리밍은 뼈대를 먼저 보내느라 상태 코드(200)를 먼저 보내 버려서, 그 뒤에 notFound() 를 불러도 404 가 되지 않는다.
// app/projects/loading.tsx 에 두면 상세(/projects/[id])·수정·후원의 "없는 페이지"까지 200 이 된다.
// (list) 처럼 괄호 폴더(라우트 그룹)는 주소에 나타나지 않으므로, 목록(/projects)에만 뼈대를 붙일 수 있다.
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
