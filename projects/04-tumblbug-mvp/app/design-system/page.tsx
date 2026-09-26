import { Heart, Plus } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import styles from "./page.module.css";

// Figma의 컴포넌트 페이지를 코드로 옮겨 한눈에 비교하는 화면 (개발용, 검색 엔진에 노출하지 않음)
export const metadata: Metadata = {
  title: "디자인 시스템 — 모아",
  robots: { index: false },
};

export default function DesignSystemPage() {
  return (
    <main className={`container ${styles.page}`}>
      <h1 className="text-heading-xl">디자인 시스템</h1>
      <p className="text-body-s text-muted">Figma 컴포넌트와 같은 이름·같은 변형. 색은 모두 CSS 변수(토큰)에서 온다.</p>

      <section className={styles.section} aria-labelledby="ds-button">
        <h2 id="ds-button" className="text-heading-m">Button</h2>
        <div className={styles.row}>
          <Button>후원하기</Button>
          <Button variant="secondary">이전</Button>
          <Button variant="ghost">더보기</Button>
          <Button disabled>마감됨</Button>
        </div>
        <div className={styles.row}>
          <Button size="m" icon={Heart}>
            찜하기
          </Button>
          <Button size="m" variant="secondary" icon={Plus}>
            리워드 추가
          </Button>
          <ButtonLink href="/" size="m" variant="ghost">
            홈으로 (링크)
          </ButtonLink>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-badge">
        <h2 id="ds-badge" className="text-heading-m">Badge</h2>
        <div className={styles.row}>
          <Badge status="funding" />
          <Badge status="success" />
          <Badge status="failed" />
          <Badge status="urgent">D-3</Badge>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-progress">
        <h2 id="ds-progress" className="text-heading-m">ProgressBar</h2>
        <div className={styles.stack}>
          <ProgressBar percent={32} label="달성률" />
          <ProgressBar percent={78} label="달성률" />
          <ProgressBar percent={132} label="달성률" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-chip">
        <h2 id="ds-chip" className="text-heading-m">Chip</h2>
        <div className={styles.row}>
          <Chip href="/design-system" selected>
            전체
          </Chip>
          <Chip href="/design-system?category=living">리빙</Chip>
          <Chip href="/design-system?category=craft">공예</Chip>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-field">
        <h2 id="ds-field" className="text-heading-m">Field (Input)</h2>
        <div className={styles.grid}>
          <Field label="목표 금액" placeholder="예: 1,000,000" helper="숫자만 입력 (원)" />
          <Field label="목표 금액" defaultValue="500" error="10,000원 이상 입력해 주세요" />
          <Field label="목표 금액" defaultValue="2,000,000" helper="후원이 있어 목표 금액은 바꿀 수 없어요" disabled />
        </div>
      </section>
    </main>
  );
}
