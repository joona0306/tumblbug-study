import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FundFlow } from "@/components/fund/FundFlow";
import { db } from "@/db";
import type { Step } from "@/lib/funding/rules";
import { isEnded } from "@/lib/project-status";
import { getProjectDetail } from "@/lib/queries/listing";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "후원하기 — 모아" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> };

// 후원하기 (Figma M04~M06). 로그인 필요 (proxy + requireUser)
export default async function FundPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { step } = await searchParams;
  const me = await requireUser(`/projects/${id}/fund`);
  const projectId = Number(id);
  const project = Number.isInteger(projectId) ? await getProjectDetail(db, projectId) : undefined;
  if (!project) notFound();

  // 후원할 수 없는 경우는 화면에서 먼저 막는다 (11주차에 서버가 결제 직전에 한 번 더 검사)
  const blocked = isEnded(project.deadline, new Date()) ? "마감된 프로젝트예요." : project.creatorId === me.id ? "내 프로젝트에는 후원할 수 없어요." : null;

  return (
    <main className="container" style={{ maxWidth: 640, paddingBlock: "var(--spacing-xl)" }}>
      <p className="text-caption text-muted" style={{ marginBottom: "var(--spacing-lg)" }}>
        <Link href={`/projects/${project.id}`}>← {project.title}</Link>
      </p>
      {blocked ? (
        <p role="alert" className="text-body-m">
          {blocked} <Link href={`/projects/${project.id}`}>프로젝트로 돌아가기</Link>
        </p>
      ) : (
        <FundFlow
          project={{ id: project.id, title: project.title, imageUrl: project.imageUrl, creatorName: project.creatorName }}
          rewards={project.rewards}
          step={(["1", "2", "3"].includes(step ?? "") ? Number(step) : 1) as Step}
        />
      )}
    </main>
  );
}
