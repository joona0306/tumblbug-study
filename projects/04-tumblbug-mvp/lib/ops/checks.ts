import { sql } from "drizzle-orm";
import type { Db } from "@/db";

// 운영 점검 (15주차) — PLAN 운영 루프의 "점검 SQL" 을 함수로. `npm run ops:check` 가 모두 돌려 보여 준다
// 모든 점검은 "문제가 있는 줄"을 돌려준다 → 빈 배열이면 정상 ✅
// (같은 SQL 을 Neon SQL Editor 에서 직접 돌려 볼 수 있게 sql/week15-ops.sql 에도 적어 두었다)

// ① 재고 어긋남: 리워드의 판매 수(sold_qty) = 재고를 잡고 있는 후원 수량의 합이어야 한다
//    재고를 잡는 후원 = 결제 완료 + 승인 단계에서 결과를 기다리는 결제 대기 (payment_key 있음, 11주차 confirm.ts)
//    어긋나면: 실패했는데 재고를 안 되돌렸거나(초과 판매 위험), 두 번 되돌렸다
export async function findStockMismatches(db: Db) {
  const result = await db.execute<{ reward_id: number; title: string; sold_qty: number; held_qty: number }>(sql`
    select r.id as reward_id, r.title, r.sold_qty,
           coalesce(sum(f.quantity) filter (where f.status = 'paid' or (f.status = 'pending' and f.payment_key is not null)), 0)::int as held_qty
    from reward r
    left join funding f on f.reward_id = r.id
    group by r.id
    having r.sold_qty <> coalesce(sum(f.quantity) filter (where f.status = 'paid' or (f.status = 'pending' and f.payment_key is not null)), 0)
    order by r.id`);
  return result.rows;
}

// ② 결제 상태 어긋남: 토스가 "승인 완료(DONE)"라고 기록했는데 우리 DB 후원은 결제 완료가 아니다
//    (웹훅·승인 결과를 반영하지 못했다 → 돈은 나갔는데 후원 내역에 없는 사람이 있다)
export async function findPaymentMismatches(db: Db) {
  const result = await db.execute<{ order_id: string; funding_status: string; received_at: string }>(sql`
    select f.order_id, f.status as funding_status, max(e.received_at)::text as received_at
    from payment_event e
    join funding f on f.order_id = e.order_id
    where e.status = 'DONE' and f.status <> 'paid'
    group by f.order_id, f.status
    order by 3 desc`);
  return result.rows;
}

// ③ 예약 작업이 돌았나: 마감이 하루 넘게 지났는데 상태가 아직 '모금중' 인 프로젝트 (매일 자정에 확정돼야 한다)
export async function findUnfinalizedProjects(db: Db) {
  const result = await db.execute<{ id: number; title: string; deadline: string }>(sql`
    select id, title, deadline::text
    from project
    where status = 'funding' and now() >= (deadline + 2)::timestamp at time zone 'Asia/Seoul'
    order by deadline`);
  return result.rows;
}

// ④ 오래된 결제 대기: 하루 넘게 결제 대기로 남은 후원 (예약 작업이 1시간 지난 것을 정리하므로, 하루 넘게 남았으면 예약 작업이 멈췄다)
export async function findStalePendings(db: Db) {
  const result = await db.execute<{ order_id: string; created_at: string; approving: boolean }>(sql`
    select order_id, created_at::text, payment_key is not null as approving
    from funding
    where status = 'pending' and created_at < now() - interval '1 day'
    order by created_at`);
  return result.rows;
}
