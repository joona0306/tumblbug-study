import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { FUNNEL_STEPS, type FunnelStep, funnelEvent, project } from "@/db/schema";

// 퍼널 기록·집계 (15주차) — PLAN 성공 지표: 상세 → 후원 시작(리워드) → 배송지 → 결제 요청 → 결제 완료
export const VISITOR_COOKIE = "moa-vid";
export const VISITOR_COOKIE_OPTIONS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true } as const;
export const FUNNEL_LABEL: Record<FunnelStep, string> = {
  view: "상세 보기",
  reward: "후원 시작 (리워드)",
  shipping: "배송지",
  payment_request: "결제 요청",
  paid: "결제 완료",
};

// 한 단계 기록. 같은 방문자·프로젝트·단계는 처음 한 번만 남는다 (기본 키 + ON CONFLICT DO NOTHING)
// 없거나 숨긴 프로젝트면 아무것도 넣지 않는다 (INSERT ... SELECT ... WHERE EXISTS)
// 반환: 넣었으면 true
export async function recordFunnelStep(db: Db, visitorId: string, projectId: number, step: FunnelStep): Promise<boolean> {
  const result = await db.execute(sql`
    insert into ${funnelEvent} (visitor_id, project_id, step)
    select ${visitorId}, ${projectId}, ${step}
    where exists (select 1 from ${project} where ${project.id} = ${projectId} and ${project.hidden} = false)
    on conflict do nothing`);
  return (result.rowCount ?? 0) > 0;
}

export type FunnelRow = { step: FunnelStep; label: string; count: number; fromPrevious: number | null; fromView: number | null };

// 최근 N일 퍼널 — 단계별 (방문자·프로젝트) 수와 전환율(%)
//  fromPrevious: 바로 앞 단계에서 넘어온 비율 → "어디서 가장 많이 빠지나"
//  fromView    : 상세를 본 사람 중 이 단계까지 온 비율 → 마지막 단계(결제 완료)가 핵심 지표
export async function getFunnel(db: Db, { days = 30, projectId }: { days?: number; projectId?: number } = {}): Promise<FunnelRow[]> {
  const rows = await db.execute<{ step: FunnelStep; count: number }>(sql`
    select step, count(*)::int as count
    from ${funnelEvent}
    where created_at >= now() - make_interval(days => ${days})
      ${projectId === undefined ? sql`` : sql`and project_id = ${projectId}`}
    group by step`);
  const counts = new Map(rows.rows.map((r) => [r.step, r.count]));
  const percent = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null); // 소수 첫째 자리까지
  const view = counts.get("view") ?? 0;
  return FUNNEL_STEPS.map((step, i) => {
    const count = counts.get(step) ?? 0;
    return {
      step,
      label: FUNNEL_LABEL[step],
      count,
      fromPrevious: i === 0 ? null : percent(count, counts.get(FUNNEL_STEPS[i - 1]) ?? 0),
      fromView: i === 0 ? null : percent(count, view),
    };
  });
}

// 배송지 통과율 (19주차 개선 — 18주차에 운영자가 직접 속았던 것)
// 배송이 없는 리워드는 배송지를 건너뛰고 결제 요청으로 간다 → 단계 개수로 나눈 "결제 요청 ÷ 배송지" 는 틀린 비율이다
// (분자에 배송지를 거치지 않은 사람이 섞인다). 그래서 사람 한 명씩 따라가서
// "배송지에 온 사람 중 결제 요청까지 간 사람" 만 센다 — sql/week18-funnel-paths.sql 의 ① 과 같은 계산
export type ShippingPass = { arrived: number; passed: number; rate: number | null };

export async function getShippingPass(db: Db, { days = 30, projectId }: { days?: number; projectId?: number } = {}): Promise<ShippingPass> {
  const result = await db.execute<{ arrived: number; passed: number }>(sql`
    with path as (
      select bool_or(step = 'shipping') as shipping, bool_or(step = 'payment_request') as payment_request
      from ${funnelEvent}
      where created_at >= now() - make_interval(days => ${days})
        ${projectId === undefined ? sql`` : sql`and project_id = ${projectId}`}
      group by visitor_id, project_id
    )
    select count(*) filter (where shipping)::int as arrived,
           count(*) filter (where shipping and payment_request)::int as passed
    from path`);
  const { arrived, passed } = result.rows[0];
  return { arrived, passed, rate: arrived > 0 ? Math.round((passed / arrived) * 1000) / 10 : null };
}
