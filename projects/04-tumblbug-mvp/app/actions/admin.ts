"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { project } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

// 프로젝트 숨기기·다시 보이기 (관리자만).
// 버튼을 숨기는 것만으로는 막은 게 아니다 — 서버 액션도 누구나 직접 부를 수 있으므로, 여기서 다시 관리자인지 확인한다
export async function setProjectHidden(formData: FormData) {
  await requireAdmin();
  const projectId = Number(formData.get("projectId"));
  const hidden = formData.get("hidden") === "true";
  if (!Number.isInteger(projectId) || projectId <= 0) return;

  await db.update(project).set({ hidden }).where(eq(project.id, projectId));
  console.log(`[관리자] 프로젝트 ${projectId} ${hidden ? "숨김" : "다시 보임"}`); // 누가 무엇을 바꿨는지 로그로 남긴다 (운영)

  // 숨김 여부가 보이는 화면들을 새로 그리게 한다
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/admin");
}
