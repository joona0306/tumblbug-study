import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { project, projectLike } from "@/db/schema";

// 찜 (project_like: user_id + project_id 가 기본 키 → 같은 프로젝트를 두 번 찜할 수 없다)

// 내가 찜한 프로젝트 번호들 (최근 찜한 순) — 카드·상세·헤더가 이 하나의 목록을 함께 본다 (TanStack Query 캐시)
export async function getMyLikeIds(db: Db, userId: string): Promise<number[]> {
  const rows = await db
    .select({ projectId: projectLike.projectId })
    .from(projectLike)
    .innerJoin(project, eq(project.id, projectLike.projectId))
    .where(and(eq(projectLike.userId, userId), eq(project.hidden, false)))
    .orderBy(desc(projectLike.createdAt));
  return rows.map((r) => r.projectId);
}

// 찜하기. 반환: "created"(새로 찜함) | "exists"(이미 찜함) | "not_found"(없거나 숨긴 프로젝트)
// ON CONFLICT DO NOTHING: 두 번 눌러도(동시에 와도) 에러 없이 한 줄만 남는다
export async function addLike(db: Db, userId: string, projectId: number): Promise<"created" | "exists" | "not_found"> {
  const [p] = await db.select({ hidden: project.hidden }).from(project).where(eq(project.id, projectId));
  if (!p || p.hidden) return "not_found";
  const inserted = await db.insert(projectLike).values({ userId, projectId }).onConflictDoNothing().returning({ projectId: projectLike.projectId });
  return inserted.length ? "created" : "exists";
}

// 찜 취소. 없던 찜을 취소해도 결과는 같다 (몇 번을 보내도 "찜 안 한 상태" — 멱등)
export async function removeLike(db: Db, userId: string, projectId: number): Promise<void> {
  await db.delete(projectLike).where(and(eq(projectLike.userId, userId), eq(projectLike.projectId, projectId)));
}
