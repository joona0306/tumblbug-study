import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateProject } from "@/app/actions/projects";
import { ProjectForm } from "@/components/project/ProjectForm";
import { db } from "@/db";
import { addDays, kstToday } from "@/lib/dates";
import { findMyProject, hasPaidFunding } from "@/lib/queries/projects";
import { requireUser } from "@/lib/session";
import { PROJECT_LIMITS } from "@/lib/validation/project";

export const metadata: Metadata = { title: "프로젝트 수정 — 모아" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
};

export default async function EditProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created, saved } = await searchParams;
  const projectId = Number(id);
  const me = await requireUser(`/projects/${id}/edit`);

  // 숫자가 아니거나, 남의 프로젝트면 "없는 페이지"
  const project = Number.isInteger(projectId) ? await findMyProject(db, projectId, me.id) : undefined;
  if (!project) notFound();

  const locked = await hasPaidFunding(db, project.id);
  const today = kstToday();

  return (
    <main className="container" style={{ maxWidth: 640, paddingBlock: "var(--spacing-2xl) var(--spacing-3xl)" }}>
      <h1 className="text-heading-l" style={{ marginBottom: "var(--spacing-lg)" }}>
        프로젝트 수정
      </h1>
      {(created || saved) && (
        <p role="status" style={{ marginBottom: "var(--spacing-xl)", padding: "var(--spacing-md)", borderRadius: "var(--radius-sm)", background: "var(--color-success-subtle)", color: "var(--color-success)" }}>
          {created ? "프로젝트를 만들었어요. 다음 주차에 리워드를 추가할 수 있어요." : "저장했어요."}
        </p>
      )}
      <ProjectForm
        action={updateProject}
        initialValues={{
          title: project.title,
          summary: project.summary,
          description: project.description,
          category: project.category,
          goalAmount: String(project.goalAmount),
          deadline: project.deadline,
        }}
        currentImageUrl={project.imageUrl}
        lockedGoalAndDeadline={locked}
        deadlineRange={{ min: addDays(today, PROJECT_LIMITS.deadlineMinDays), max: addDays(today, PROJECT_LIMITS.deadlineMaxDays) }}
        submitLabel="저장하기"
      >
        <input type="hidden" name="projectId" value={project.id} />
      </ProjectForm>
    </main>
  );
}
