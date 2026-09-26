import Image from "next/image";
import Link from "next/link";
import { LikeButton } from "@/components/like/LikeButton";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CATEGORIES } from "@/lib/categories";
import { achievementRate, formatWon } from "@/lib/format";
import { remainingLabel, urgentLabel } from "@/lib/project-status";
import type { ProjectCardData } from "@/lib/queries/listing";
import styles from "./ProjectCard.module.css";

// Figma ProjectCard: 사진(4:3) + 카테고리·창작자 + (배지) + 제목 + 진행률 + %·금액·남은 기간
// compact: 좁은 2열 카드에서는 금액을 숨긴다 (Figma "Show amount")
export function ProjectCard({ project, now, compact = false, priority = false }: { project: ProjectCardData; now: Date; compact?: boolean; priority?: boolean }) {
  const rate = achievementRate(project.raised, project.goalAmount);
  const urgent = urgentLabel(project.deadline, now);
  return (
    <article className={styles.card}>
      {/* 찜 버튼은 링크 "밖"에 둔다 — 링크 안에 버튼을 넣으면 누를 때 상세로 이동해 버린다 (그리고 HTML 규칙 위반) */}
      <LikeButton projectId={project.id} title={project.title} />
      <Link href={`/projects/${project.id}`} className={styles.link}>
        <div className={styles.image}>
          <Image src={project.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 270px" priority={priority} />
        </div>
        <p className="text-caption text-muted">
          {CATEGORIES[project.category]} · {project.creatorName}
        </p>
        {project.status !== "funding" ? (
          <Badge status={project.status} />
        ) : (
          urgent && <Badge status="urgent">{urgent}</Badge>
        )}
        <h3 className={`text-heading-m ${styles.title}`}>{project.title}</h3>
      </Link>
      <ProgressBar percent={rate} label={`${project.title} 달성률`} />
      <p className={styles.stats}>
        <span className={styles.rate}>{rate}%</span>
        {!compact && <span className="text-body-s text-muted">{formatWon(project.raised)}</span>}
        <span className={`text-body-s text-muted ${styles.days}`}>{remainingLabel(project.deadline, now)}</span>
      </p>
    </article>
  );
}
