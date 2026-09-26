import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project, user } from "@/db/schema";

// 관리자 화면 (13주차) 조회

// 모든 프로젝트 — 숨긴 것도 포함 (관리자는 숨긴 프로젝트를 다시 보이게 할 수 있어야 하므로)
export async function listAllProjects(db: Db) {
  return db
    .select({ id: project.id, title: project.title, creatorName: user.name, deadline: project.deadline, status: project.status, hidden: project.hidden })
    .from(project)
    .innerJoin(user, eq(user.id, project.creatorId))
    .orderBy(desc(project.createdAt), desc(project.id));
}

const since = (days: number) => sql`now() - make_interval(days => ${days})`;

// 최근 결제 실패 목록 (새것부터)
export async function listPaymentFailures(db: Db, { days = 30, limit = 50 } = {}) {
  return db
    .select({
      id: funding.id,
      orderId: funding.orderId,
      amount: funding.amount,
      failReason: funding.failReason,
      reachedApproval: sql<boolean>`${funding.paymentKey} is not null`, // 승인 단계까지 갔나 (결제창 취소와 구분)
      createdAt: funding.createdAt,
      projectTitle: project.title,
      supporterName: user.name,
    })
    .from(funding)
    .innerJoin(project, eq(project.id, funding.projectId))
    .innerJoin(user, eq(user.id, funding.supporterId))
    .where(and(eq(funding.status, "failed"), gte(funding.createdAt, since(days))))
    .orderBy(desc(funding.createdAt), desc(funding.id))
    .limit(limit);
}

// 실패 이유별 개수 (운영 지표: 어디서 가장 많이 실패하나 — 결제창 취소? 품절? 카드 거절?)
export async function countFailureReasons(db: Db, { days = 30 } = {}) {
  return db
    .select({ reason: sql<string>`coalesce(${funding.failReason}, 'UNKNOWN')`, count: sql<number>`count(*)::int` })
    .from(funding)
    .where(and(eq(funding.status, "failed"), gte(funding.createdAt, since(days))))
    .groupBy(sql`1`)
    .orderBy(desc(sql`2`));
}
