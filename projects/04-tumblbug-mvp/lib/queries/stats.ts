import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project } from "@/db/schema";

// 프로젝트별 모인 금액·후원자 수 (sql/week6-stats.sql ①을 Drizzle로 옮긴 것).
// 달성률은 lib/format.ts 의 achievementRate 로 계산한다 — 규칙(소수점 버림)을 한 곳에 두기 위해.
// 진행률·후원자 수는 DB에 저장하지 않고 매번 후원에서 계산한다 (정규화 — templates/07-data-model.md ③)

export type ProjectStats = {
  projectId: number;
  goalAmount: number;
  raised: number; // 결제 완료된 후원 금액 합계
  supporters: number; // 결제 완료한 서로 다른 후원자 수
};

export async function getProjectStats(db: Db, projectIds: number[]): Promise<ProjectStats[]> {
  if (projectIds.length === 0) return [];
  return db
    .select({
      projectId: project.id,
      goalAmount: project.goalAmount,
      // sum·count 결과는 PostgreSQL에서 큰 정수(bigint)라 글자로 온다 → ::int 로 바꿔서 숫자로 받는다
      raised: sql<number>`coalesce(sum(${funding.amount}), 0)::int`,
      supporters: sql<number>`count(distinct ${funding.supporterId})::int`,
    })
    .from(project)
    // LEFT JOIN: 후원이 0건인 프로젝트도 빠지지 않게. 조건에 status='paid'를 넣어 결제 완료만 붙인다
    .leftJoin(funding, and(eq(funding.projectId, project.id), eq(funding.status, "paid")))
    .where(inArray(project.id, projectIds))
    .groupBy(project.id);
}
