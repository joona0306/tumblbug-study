import type { Metadata } from "next";
import { createProject } from "@/app/actions/projects";
import { ProjectForm } from "@/components/project/ProjectForm";
import { addDays, kstToday } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { PROJECT_LIMITS } from "@/lib/validation/project";

export const metadata: Metadata = { title: "프로젝트 만들기 — 모아" };

export default async function NewProjectPage() {
  await requireUser("/projects/new");
  const today = kstToday();

  return (
    <main className="container" style={{ maxWidth: 640, paddingBlock: "var(--spacing-2xl) var(--spacing-3xl)" }}>
      <h1 className="text-heading-l" style={{ marginBottom: "var(--spacing-xl)" }}>
        프로젝트 만들기
      </h1>
      <ProjectForm
        action={createProject}
        deadlineRange={{ min: addDays(today, PROJECT_LIMITS.deadlineMinDays), max: addDays(today, PROJECT_LIMITS.deadlineMaxDays) }}
        submitLabel="프로젝트 만들기"
      />
    </main>
  );
}
