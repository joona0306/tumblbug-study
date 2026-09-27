-- 15주차 운영 점검 SQL — Neon 콘솔 → SQL Editor 에 붙여 넣어 하나씩 실행해 본다 (읽기만 한다)
-- 같은 점검을 lib/ops/checks.ts 가 함수로 갖고 있고, `npm run ops:check` 가 한 번에 돌린다

-- ⓪ 퍼널: 최근 30일, 단계별 (방문자·프로젝트) 수
select step, count(*) as visitors
from funnel_event
where created_at >= now() - interval '30 days'
group by step
order by array_position(array['view','reward','shipping','payment_request','paid'], step);

-- ① 재고 어긋남: 판매 수(sold_qty) ≠ 재고를 잡고 있는 후원 수량 (결제 완료 + 승인 중)
select r.id, r.title, r.sold_qty,
       coalesce(sum(f.quantity) filter (where f.status = 'paid' or (f.status = 'pending' and f.payment_key is not null)), 0) as held_qty
from reward r
left join funding f on f.reward_id = r.id
group by r.id
having r.sold_qty <> coalesce(sum(f.quantity) filter (where f.status = 'paid' or (f.status = 'pending' and f.payment_key is not null)), 0);

-- ② 결제 상태 어긋남: 토스가 DONE 이라고 했는데 우리 후원은 결제 완료가 아님
select f.order_id, f.status, max(e.received_at) as received_at
from payment_event e
join funding f on f.order_id = e.order_id
where e.status = 'DONE' and f.status <> 'paid'
group by f.order_id, f.status;

-- ③ 예약 작업 미실행 의심: 마감이 하루 넘게 지났는데 아직 모금중
select id, title, deadline
from project
where status = 'funding' and now() >= (deadline + 2)::timestamp at time zone 'Asia/Seoul';

-- ④ 하루 넘게 결제 대기로 남은 후원
select order_id, created_at, payment_key is not null as approving
from funding
where status = 'pending' and created_at < now() - interval '1 day';

-- ⑤ 결제 실패 이유 분포 (최근 30일)
select coalesce(fail_reason, 'UNKNOWN') as reason, count(*)
from funding
where status = 'failed' and created_at >= now() - interval '30 days'
group by 1
order by 2 desc;
