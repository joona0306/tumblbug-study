import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project, reward, user } from "@/db/schema";

// 창작자 대시보드 (13주차) — 모든 숫자는 저장하지 않고 후원 기록에서 SQL로 계산한다 (6주차 집계를 화면으로)
// 모든 조회는 "결제 완료(paid)" 후원만 센다

// ① 요약: 모인 금액·후원자 수·후원 건수·평균 후원액
export async function getDashboardSummary(db: Db, projectId: number) {
  const [row] = await db
    .select({
      goalAmount: project.goalAmount,
      deadline: project.deadline,
      raised: sql<number>`coalesce(sum(${funding.amount}), 0)::int`,
      supporters: sql<number>`count(distinct ${funding.supporterId})::int`,
      fundings: sql<number>`count(${funding.id})::int`,
      // avg 는 소수가 나온다 → round 로 원 단위 정수
      average: sql<number>`coalesce(round(avg(${funding.amount})), 0)::int`,
    })
    .from(project)
    .leftJoin(funding, and(eq(funding.projectId, project.id), eq(funding.status, "paid")))
    .where(eq(project.id, projectId))
    .groupBy(project.id);
  return row;
}

// ② 최근 며칠의 날짜별 모금 (sql/week6-stats.sql ⑤ 와 같은 방법)
//  - 한국 시간으로 날짜를 자른다 (UTC 로 자르면 새벽 0~9시 후원이 전날로 잡힌다)
//  - generate_series 로 날짜 목록을 먼저 만들고 LEFT JOIN → 후원이 없는 날도 0으로 나온다
export async function getDailyRaised(db: Db, projectId: number, days = 14): Promise<{ day: string; amount: number; count: number }[]> {
  const result = await db.execute<{ day: string; amount: number; count: number }>(sql`
    select d::date::text as day,
           coalesce(sum(f.amount), 0)::int as amount,
           count(f.id)::int as count
    from generate_series(
      (now() at time zone 'Asia/Seoul')::date - ${days - 1}::int,
      (now() at time zone 'Asia/Seoul')::date,
      interval '1 day'
    ) as d
    left join ${funding} f
      on f.project_id = ${projectId}
      and f.status = 'paid'
      and (f.paid_at at time zone 'Asia/Seoul')::date = d::date
    group by d
    order by d`);
  return result.rows;
}

// ③ 리워드별 판매: 몇 개·얼마 (리워드 없이 후원은 따로 한 줄)
export async function getRewardBreakdown(db: Db, projectId: number) {
  const rewards = await db
    .select({
      id: reward.id,
      title: reward.title,
      price: reward.price,
      limitQty: reward.limitQty,
      soldQty: reward.soldQty,
      paidQty: sql<number>`coalesce(sum(${funding.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${funding.amount}), 0)::int`,
    })
    .from(reward)
    .leftJoin(funding, and(eq(funding.rewardId, reward.id), eq(funding.status, "paid")))
    .where(eq(reward.projectId, projectId))
    .groupBy(reward.id)
    .orderBy(asc(reward.sortOrder), asc(reward.id));

  const [noReward] = await db
    .select({ count: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${funding.amount}), 0)::int` })
    .from(funding)
    .where(and(eq(funding.projectId, projectId), eq(funding.status, "paid"), sql`${funding.rewardId} is null`));
  return { rewards, noReward };
}

// ④ 후원자·배송지 목록 — 개인정보: 결제 완료 후원만, 그 프로젝트의 창작자에게만 보여 준다 (호출하는 쪽이 주인 확인)
export async function listSupporters(db: Db, projectId: number) {
  return db
    .select({
      id: funding.id,
      supporterName: user.name,
      supporterEmail: user.email,
      rewardTitle: reward.title,
      quantity: funding.quantity,
      amount: funding.amount,
      recipientName: funding.recipientName,
      recipientPhone: funding.recipientPhone,
      address: funding.address,
      paidAt: funding.paidAt,
    })
    .from(funding)
    .innerJoin(user, eq(user.id, funding.supporterId))
    .leftJoin(reward, eq(reward.id, funding.rewardId))
    .where(and(eq(funding.projectId, projectId), eq(funding.status, "paid")))
    .orderBy(desc(funding.paidAt), desc(funding.id));
}
