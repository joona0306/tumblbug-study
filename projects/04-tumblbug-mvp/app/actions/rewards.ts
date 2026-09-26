"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { funding, reward } from "@/db/schema";
import { kstToday } from "@/lib/dates";
import { findMyProject } from "@/lib/queries/projects";
import { requireUser } from "@/lib/session";
import { type FieldErrors, toFieldErrors } from "@/lib/validation/auth";
import { REWARD_LIMITS, rewardSchema } from "@/lib/validation/reward";

export type RewardFormState = {
  ok?: boolean; // 저장 성공 → 폼을 비운다
  error?: string;
  fields?: FieldErrors;
  values: Record<string, string>;
} | null;

const FIELD_NAMES = ["title", "description", "price", "limitQty", "deliveryMonth", "needsShipping"] as const;
const readForm = (formData: FormData) => Object.fromEntries(FIELD_NAMES.map((n) => [n, String(formData.get(n) ?? "")]));

// 이 프로젝트가 "내 것"인지 먼저 확인한다 (남의 프로젝트에 리워드를 붙이거나 고치지 못하게)
async function requireMyProject(formData: FormData) {
  const projectId = Number(formData.get("projectId"));
  const me = await requireUser(`/projects/${projectId}/edit`);
  const project = await findMyProject(db, projectId, me.id);
  if (!project) notFound();
  return project;
}

// 이 리워드로 들어온 후원(결제 대기 포함)이 있는가 → 있으면 금액 변경·삭제 불가
async function hasFundings(rewardId: number) {
  const [row] = await db.select({ n: count() }).from(funding).where(eq(funding.rewardId, rewardId));
  return row.n > 0;
}

export async function createReward(_prev: RewardFormState, formData: FormData): Promise<RewardFormState> {
  const project = await requireMyProject(formData);
  const values = readForm(formData);
  const parsed = rewardSchema(kstToday().slice(0, 7)).safeParse(values);
  if (!parsed.success) return { fields: toFieldErrors(parsed.error), values };

  const existing = await db.select({ sortOrder: reward.sortOrder }).from(reward).where(eq(reward.projectId, project.id)).orderBy(asc(reward.sortOrder));
  if (existing.length >= REWARD_LIMITS.perProject) {
    return { error: `리워드는 프로젝트당 ${REWARD_LIMITS.perProject}개까지 만들 수 있어요`, values };
  }

  await db.insert(reward).values({ ...parsed.data, projectId: project.id, sortOrder: existing.length });
  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/edit`);
  return { ok: true, values: {} };
}

export async function updateReward(_prev: RewardFormState, formData: FormData): Promise<RewardFormState> {
  const project = await requireMyProject(formData);
  const rewardId = Number(formData.get("rewardId"));
  const values = readForm(formData);
  const [current] = await db.select().from(reward).where(and(eq(reward.id, rewardId), eq(reward.projectId, project.id)));
  if (!current) notFound();

  const sold = await hasFundings(rewardId);
  // 판매된 리워드는 금액 칸이 비활성이라 값이 오지 않는다 → 원래 금액으로 검사·저장
  const parsed = rewardSchema(kstToday().slice(0, 7)).safeParse(sold ? { ...values, price: String(current.price) } : values);
  if (!parsed.success) return { fields: toFieldErrors(parsed.error), values };
  if (parsed.data.limitQty !== null && parsed.data.limitQty < current.soldQty) {
    return { fields: { limitQty: `이미 ${current.soldQty}개 팔렸어요. ${current.soldQty}개 이상으로 입력해 주세요` }, values };
  }

  await db
    .update(reward)
    .set({ ...parsed.data, price: sold ? current.price : parsed.data.price })
    .where(eq(reward.id, rewardId));
  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/edit`);
  return { ok: true, values };
}

export async function deleteReward(formData: FormData): Promise<void> {
  const project = await requireMyProject(formData);
  const rewardId = Number(formData.get("rewardId"));
  // 후원이 딸린 리워드는 지우지 않는다 (화면에서도 버튼을 숨기지만, 서버에서 한 번 더)
  if (await hasFundings(rewardId)) return;
  await db.delete(reward).where(and(eq(reward.id, rewardId), eq(reward.projectId, project.id)));
  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/edit`);
}
