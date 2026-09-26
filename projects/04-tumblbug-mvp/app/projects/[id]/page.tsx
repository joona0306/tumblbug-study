import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LikeButton } from "@/components/like/LikeButton";
import { RewardCard } from "@/components/reward/RewardCard";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { db } from "@/db";
import { CATEGORIES } from "@/lib/categories";
import { achievementRate, formatWon } from "@/lib/format";
import { getProjectStatus, isEnded, remainingLabel } from "@/lib/project-status";
import { getMyLikeIds } from "@/lib/queries/likes";
import { getProjectDetail } from "@/lib/queries/listing";
import { getCurrentUser } from "@/lib/session";
import styles from "./detail.module.css";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const projectId = Number(id);
  return Number.isInteger(projectId) ? getProjectDetail(db, projectId) : undefined;
}

// 브라우저 탭 제목·공유 미리보기에 프로젝트 제목을 쓴다
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await load((await params).id);
  return project ? { title: `${project.title} — 모아`, description: project.summary } : {};
}

// 상세 (Figma M03 / D02): 사진 + 요약 + 진행률 + 리워드 + 소개 + 하단 고정 후원 바
export default async function ProjectDetailPage({ params }: Props) {
  const project = await load((await params).id);
  if (!project) notFound();

  const now = new Date();
  const me = await getCurrentUser();
  const rate = achievementRate(project.raised, project.goalAmount);
  const status = getProjectStatus({ ...project, now }); // ADR-001: 화면은 항상 계산값
  const ended = isEnded(project.deadline, now);
  const mine = me?.id === project.creatorId;
  const [, month, day] = project.deadline.split("-");
  const likedAtRender = me ? (await getMyLikeIds(db, me.id)).includes(project.id) : false;

  // 후원 버튼 상태: 끝남 / 내 프로젝트 / 후원 가능 (서버도 11주차에 같은 규칙으로 한 번 더 막는다)
  const cta = ended ? (
    <Button fullWidth disabled>
      마감된 프로젝트예요
    </Button>
  ) : mine ? (
    <ButtonLink href={`/projects/${project.id}/edit`} variant="secondary" fullWidth>
      내 프로젝트 수정하기
    </ButtonLink>
  ) : (
    <ButtonLink href={`/projects/${project.id}/fund`} fullWidth>
      이 프로젝트 후원하기
    </ButtonLink>
  );

  // 찜 버튼(하트 + 개수)을 후원 버튼 왼쪽에 (Figma BottomBar)
  const ctaRow = (
    <>
      <LikeButton projectId={project.id} title={project.title} variant="labeled" count={project.likeCount} likedAtRender={likedAtRender} />
      {cta}
    </>
  );

  return (
    <main className={styles.page}>
      <div className={`container ${styles.layout}`}>
        <div className={styles.image}>
          <Image src={project.imageUrl} alt={`${project.title} 대표 사진`} fill priority sizes="(max-width: 1024px) 100vw, 700px" />
        </div>

        <section className={styles.summary} aria-label="프로젝트 요약">
          <p className="text-label">
            {project.creatorName} <span className="text-caption text-muted">{CATEGORIES[project.category]}</span>
          </p>
          <h1 className="text-heading-l">{project.title}</h1>
          <p className="text-body-s text-muted">{project.summary}</p>
          {status !== "funding" && <Badge status={status} />}

          <p className={styles.amount}>
            <span className={`text-display ${styles.rate}`}>{rate}%</span>
            <span className="text-body-m-strong">{formatWon(project.raised)} 모임</span>
          </p>
          <ProgressBar percent={rate} label="달성률" />
          <dl className={styles.stats}>
            <div>
              <dt className="text-caption text-muted">목표 금액</dt>
              <dd className="text-body-m-strong">{formatWon(project.goalAmount)}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted">후원자</dt>
              <dd className="text-body-m-strong">{project.supporters}명</dd>
            </div>
            <div>
              <dt className="text-caption text-muted">남은 기간</dt>
              <dd className="text-body-m-strong">{remainingLabel(project.deadline, now)}</dd>
            </div>
          </dl>
          <p className={styles.notice}>
            <CalendarDays size={16} aria-hidden="true" />
            {Number(month)}월 {Number(day)}일 23:59 마감 · 후원 즉시 결제 (테스트 모드)
          </p>
          <div className={styles.ctaDesktop}>
            <div className={styles.ctaRow}>{ctaRow}</div>
          </div>

          <h2 className="text-heading-m" style={{ marginTop: "var(--spacing-lg)" }}>
            리워드
          </h2>
          {project.rewards.length === 0 ? (
            <p className="text-body-s text-muted">아직 리워드가 없어요. 리워드 없이 후원할 수 있어요.</p>
          ) : (
            project.rewards.map((r) => <RewardCard key={r.id} reward={r} />)
          )}
        </section>

        <section className={styles.description} aria-labelledby="about-title">
          <h2 id="about-title" className="text-heading-m">
            프로젝트 소개
          </h2>
          <p className={`text-body-m ${styles.body}`}>{project.description || "소개가 아직 없어요."}</p>
          <p className="text-caption text-muted">
            <Link href="/projects">← 다른 프로젝트 둘러보기</Link>
          </p>
        </section>
      </div>

      {/* 모바일: 스크롤해도 후원 버튼이 항상 보이게 하단에 고정 (Figma BottomBar) */}
      <div className={styles.bottomBar}>
        <div className={styles.ctaRow}>{ctaRow}</div>
      </div>
    </main>
  );
}
