import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project, reward, user } from "@/db/schema";

// 창작자 화면(/studio)용 조회 — 12주차: 내 프로젝트 목록 + 최근 후원 (13주차에 SQL 집계를 더해 대시보드로 키운다)

// 내가 만든 프로젝트 (최근에 만든 순)
export async function listMyProjects(db: Db, creatorId: string) {
  return db
    .select({ id: project.id, title: project.title, deadline: project.deadline, hidden: project.hidden })
    .from(project)
    .where(eq(project.creatorId, creatorId))
    .orderBy(desc(project.createdAt), desc(project.id));
}

export type RecentFunding = {
  id: number;
  supporterName: string;
  amount: number;
  rewardTitle: string | null;
  quantity: number;
  message: string;
  paidAt: string; // ISO 시각 (JSON 으로 보내므로 글자로)
};

// 이 프로젝트의 최근 "결제 완료" 후원 5건 (새것부터 — 전체 목록은 대시보드의 후원자 표). 응원 메시지는 창작자에게만 보여 준다 (확인 화면 안내와 같게)
export async function listRecentFundings(db: Db, projectId: number, limit = 5): Promise<RecentFunding[]> {
  const rows = await db
    .select({
      id: funding.id,
      supporterName: user.name,
      amount: funding.amount,
      rewardTitle: reward.title,
      quantity: funding.quantity,
      message: funding.message,
      paidAt: funding.paidAt,
    })
    .from(funding)
    .innerJoin(user, eq(user.id, funding.supporterId))
    .leftJoin(reward, eq(reward.id, funding.rewardId))
    .where(and(eq(funding.projectId, projectId), eq(funding.status, "paid")))
    .orderBy(desc(funding.paidAt), desc(funding.id))
    .limit(limit);
  // paid 인 후원은 paid_at 이 반드시 있다 (funding_paid_check) → ! 로 "없을 리 없음"을 알린다
  return rows.map((r) => ({ ...r, paidAt: r.paidAt!.toISOString() }));
}

// 이 프로젝트의 주인인가? → "ok" | "not_found"(없거나 숨김) | "forbidden"(남의 프로젝트)
export async function checkProjectOwner(db: Db, projectId: number, userId: string): Promise<"ok" | "not_found" | "forbidden"> {
  const [p] = await db.select({ creatorId: project.creatorId, hidden: project.hidden }).from(project).where(eq(project.id, projectId));
  if (!p || p.hidden) return "not_found";
  return p.creatorId === userId ? "ok" : "forbidden";
}
