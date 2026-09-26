import { Skeleton } from "@/components/ui/Skeleton";
import styles from "./detail.module.css";

// 프로젝트 상세를 불러오는 동안: 사진 + 요약 자리의 뼈대 (실제 화면과 같은 배치라 내용이 들어와도 덜컹거리지 않는다)
export default function ProjectLoading() {
  return (
    <main className={styles.page}>
      <p className="sr-only" role="status">
        프로젝트를 불러오는 중…
      </p>
      {/* container(전역 CSS)와 layout(모듈 CSS)을 한 요소에 같이 붙이면, CSS 불러오는 순서에 따라 container 의 padding 이
          layout 의 padding-top 을 덮어쓸 수 있다 → 요소를 나눠서 서로 부딪히지 않게 */}
      <div className="container">
        <div className={styles.layout}>
          <Skeleton height="auto" className={styles.image} radius="var(--radius-md)" />
          <section className={styles.summary}>
            <Skeleton width="30%" height={14} />
            <Skeleton width="85%" height={28} />
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={40} />
            <Skeleton height={8} />
            <Skeleton height={52} radius="var(--radius-md)" />
          </section>
        </div>
      </div>
    </main>
  );
}
