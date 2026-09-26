"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { project } from "@/db/schema";
import { checkImage, deleteImageIfOurs, uploadProjectImage } from "@/lib/blob";
import { kstToday } from "@/lib/dates";
import { findMyProject, hasPaidFunding } from "@/lib/queries/projects";
import { requireUser } from "@/lib/session";
import { type FieldErrors, toFieldErrors } from "@/lib/validation/auth";
import { projectSchema } from "@/lib/validation/project";

// 폼이 돌려받는 결과: 폼 전체 에러 + 칸마다 에러 + 다시 채워 줄 값
export type ProjectFormState = {
  error?: string;
  fields?: FieldErrors;
  values: Record<string, string>;
} | null;

const FIELD_NAMES = ["title", "summary", "description", "category", "goalAmount", "deadline"] as const;

function readForm(formData: FormData) {
  return Object.fromEntries(FIELD_NAMES.map((name) => [name, String(formData.get(name) ?? "")]));
}

// 폼의 사진 칸: 새로 골랐으면 File, 안 골랐으면 null
function pickedImage(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : null;
}

// 프로젝트 만들기
export async function createProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const me = await requireUser("/projects/new");
  const values = readForm(formData);

  const parsed = projectSchema(kstToday()).safeParse(values);
  const image = pickedImage(formData);
  const imageError = image ? checkImage(image) : "대표 사진을 1장 골라 주세요";
  if (!parsed.success || imageError) {
    const fields = parsed.success ? {} : toFieldErrors(parsed.error);
    if (imageError) fields.image = imageError;
    return { fields, values };
  }

  const imageUrl = await uploadProjectImage(me.id, image!);
  const [created] = await db
    .insert(project)
    .values({ ...parsed.data, creatorId: me.id, imageUrl })
    .returning({ id: project.id });

  revalidatePath("/");
  // 리워드는 8주차에 수정 화면에서 추가한다
  redirect(`/projects/${created.id}/edit?created=1`);
}

// 프로젝트 수정 — 내 프로젝트만. 결제 완료 후원이 있으면 목표 금액·마감일은 바꿀 수 없다
export async function updateProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const projectId = Number(formData.get("projectId"));
  const me = await requireUser(`/projects/${projectId}/edit`);
  const current = await findMyProject(db, projectId, me.id);
  if (!current) notFound(); // 남의 프로젝트 id를 보내도 "없는 것"으로

  const values = readForm(formData);
  const locked = await hasPaidFunding(db, projectId);
  // 잠겼으면 목표 금액·마감일 칸은 검사하지 않고(화면에서도 비활성) DB의 원래 값을 그대로 둔다
  const schema = locked ? projectSchema(kstToday()).omit({ goalAmount: true, deadline: true }) : projectSchema(kstToday());

  const parsed = schema.safeParse(values);
  const image = pickedImage(formData);
  const imageError = image ? checkImage(image) : null;
  if (!parsed.success || imageError) {
    const fields = parsed.success ? {} : toFieldErrors(parsed.error);
    if (imageError) fields.image = imageError;
    return { fields, values };
  }

  const imageUrl = image ? await uploadProjectImage(me.id, image) : current.imageUrl;
  await db
    .update(project)
    .set({ ...parsed.data, imageUrl })
    .where(eq(project.id, projectId));
  // 새 사진을 올렸다면 이전 사진은 지운다 (저장소에 주인 없는 사진이 쌓이지 않게)
  if (image) await deleteImageIfOurs(current.imageUrl);

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/edit?saved=1`);
}
