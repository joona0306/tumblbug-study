import styles from "./Skeleton.module.css";

// 뼈대 로딩 (Figma State/Loading): 내용이 올 자리를 회색 상자로 먼저 보여 준다
// → 빈 화면보다 "곧 나온다"는 느낌을 주고, 내용이 들어올 때 화면이 덜컹거리지 않는다
export function Skeleton({ width = "100%", height = 16, radius, className }: { width?: number | string; height?: number | string; radius?: string; className?: string }) {
  return <span className={`${styles.skeleton} ${className ?? ""}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

// 프로젝트 카드 모양의 뼈대 (목록·홈에서)
export function CardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton height="auto" className={styles.image} radius="var(--radius-md)" />
      <Skeleton width="60%" height={12} />
      <Skeleton width="90%" height={20} />
      <Skeleton height={6} />
      <Skeleton width="40%" height={14} />
    </div>
  );
}
