import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project } from "@/db/schema";

// 내 프로젝트 하나 (남의 프로젝트면 undefined) — "이 id 이면서 + 내 것"을 한 번에 확인한다
export async function findMyProject(db: Db, projectId: number, userId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.creatorId, userId)));
  return row;
}

// 결제 완료된 후원이 한 건이라도 있는가 → 있으면 목표 금액·마감일을 바꿀 수 없다 (PRD C-2)
export async function hasPaidFunding(db: Db, projectId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: funding.id })
    .from(funding)
    .where(and(eq(funding.projectId, projectId), eq(funding.status, "paid")))
    .limit(1);
  return Boolean(row);
}
