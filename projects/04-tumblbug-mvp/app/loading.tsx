import { Skeleton } from "@/components/ui/Skeleton";

// 페이지를 서버에서 그리는 동안 보여 주는 화면 (Next.js 규칙 파일 — 이 폴더 아래 모든 페이지에 적용)
// 더 알맞은 뼈대가 있는 곳(목록·상세)은 그 폴더에 loading.tsx 를 따로 둔다
export default function Loading() {
  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)", paddingBlock: "var(--spacing-xl)" }}>
      <p className="sr-only" role="status">
        불러오는 중…
      </p>
      <Skeleton width="40%" height={32} />
      <Skeleton height={120} radius="var(--radius-md)" />
      <Skeleton height={16} />
      <Skeleton width="80%" height={16} />
      <Skeleton width="60%" height={16} />
    </main>
  );
}
