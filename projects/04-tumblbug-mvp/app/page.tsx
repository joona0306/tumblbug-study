import { ChevronRight, Sprout } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProjectCard } from "@/components/project/ProjectCard";
import grid from "@/components/project/ProjectGrid.module.css";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { db } from "@/db";
import { CATEGORIES } from "@/lib/categories";
import { listProjects } from "@/lib/queries/listing";
import styles from "./home.module.css";

// 대표 배너 사진 (Unsplash License — Annie Spratt)
const HERO_IMAGE = "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=1600&q=80&fm=jpg";

// 홈 (Figma M01 / D01): 대표 배너 + 카테고리 + 마감 임박 + 인기
export default async function Home() {
  const now = new Date();
  const [closingSoon, popular] = await Promise.all([
    listProjects(db, { status: "funding", sort: "deadline", limit: 4 }),
    listProjects(db, { status: "funding", sort: "popular", limit: 4 }),
  ]);

  return (
    <main className={styles.page}>
      <section className={`container ${styles.heroWrap}`}>
        <div className={styles.hero}>
          <Image src={HERO_IMAGE} alt="" fill priority sizes="(max-width: 1120px) 100vw, 1120px" />
          <div className={styles.heroText}>
            <h1 className="text-display">작은 공방의 첫 생산을 응원하세요</h1>
            <p className="text-body-m">작은 응원이 모여 창작이 완성돼요</p>
          </div>
        </div>
      </section>

      <nav className={`container ${styles.categories}`} aria-label="카테고리">
        <Chip href="/projects" selected>
          전체
        </Chip>
        {Object.entries(CATEGORIES).map(([value, label]) => (
          <Chip key={value} href={`/projects?category=${value}`}>
            {label}
          </Chip>
        ))}
      </nav>

      {closingSoon.length === 0 && (
        <div className="container">
          <EmptyState icon={Sprout} title="지금 모금 중인 프로젝트가 없어요" description="첫 번째 프로젝트의 주인공이 되어 보세요." action={{ href: "/projects/new", label: "프로젝트 올리기" }} />
        </div>
      )}

      {closingSoon.length > 0 && (
        <Section title="마감 임박 프로젝트" href="/projects">
          <div className={grid.scroller}>
            {closingSoon.map((p, i) => (
              <ProjectCard key={p.id} project={p} now={now} priority={i < 2} />
            ))}
          </div>
        </Section>
      )}

      {popular.length > 0 && (
        <Section title="인기 프로젝트" href="/projects?sort=popular">
          <div className={grid.grid}>
            {popular.map((p) => (
              <ProjectCard key={p.id} project={p} now={now} compact />
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className={`container ${styles.section}`} aria-label={title}>
      <div className={styles.sectionHead}>
        <h2 className="text-heading-m">{title}</h2>
        <Link href={href} className={styles.more}>
          전체보기 <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  );
}
