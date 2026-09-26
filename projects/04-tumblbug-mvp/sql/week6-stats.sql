-- 6주차 5단계: 대시보드 통계를 SQL로 직접 써 보기
-- Neon SQL Editor (tumblbug_dev) 에서 한 덩어리씩 실행한다. 시드 데이터(npm run db:seed)가 있어야 결과가 나온다.

-- ① 프로젝트별 모인 금액·후원자 수·달성률
--    LEFT JOIN: 후원이 0건인 프로젝트도 빠지지 않게 / FILTER: 결제 완료(paid)만 센다
select
  p.id,
  p.title,
  p.goal_amount,
  coalesce(sum(f.amount) filter (where f.status = 'paid'), 0) as raised,
  count(distinct f.supporter_id) filter (where f.status = 'paid') as supporters,
  floor(100.0 * coalesce(sum(f.amount) filter (where f.status = 'paid'), 0) / p.goal_amount) as rate
from project p
left join funding f on f.project_id = p.id
group by p.id
order by rate desc;

-- ② 목표를 넘긴 프로젝트만 (집계 결과로 거를 때는 WHERE 가 아니라 HAVING)
select p.title, sum(f.amount) as raised, p.goal_amount
from project p
join funding f on f.project_id = p.id and f.status = 'paid'
group by p.id
having sum(f.amount) >= p.goal_amount;

-- ③ 창작자 대시보드: 리워드별 판매 수량과 남은 수량
select
  r.title,
  r.sold_qty,
  r.limit_qty,
  case when r.limit_qty is null then '무제한' else (r.limit_qty - r.sold_qty)::text end as remaining
from reward r
join project p on p.id = r.project_id
where p.title = '손으로 두드려 만든 구리 펜던트 조명'
order by r.sort_order;

-- ④ 찜 → 후원 전환율: 찜한 사람 중 그 프로젝트에 후원도 한 사람의 비율 (EXISTS 서브쿼리)
select
  p.title,
  count(*) as likers,
  count(*) filter (
    where exists (
      select 1 from funding f
      where f.project_id = l.project_id and f.supporter_id = l.user_id and f.status = 'paid'
    )
  ) as likers_who_funded,
  round(100.0 * count(*) filter (
    where exists (
      select 1 from funding f
      where f.project_id = l.project_id and f.supporter_id = l.user_id and f.status = 'paid'
    )
  ) / count(*), 1) as conversion_rate
from project_like l
join project p on p.id = l.project_id
group by p.id
order by conversion_rate desc;

-- ⑤ 최근 7일 날짜별 후원 금액 — 한국 시간 기준으로 묶는다
--    DB 서버는 UTC 라서 그냥 ::date 로 자르면 한국 시간 새벽 0~9시 후원이 "전날"로 잡힌다
--    at time zone 'Asia/Seoul' = "이 시각을 한국 시간으로 바꿔서"
--    generate_series: 후원이 없는 날도 0으로 보이게 날짜 목록을 먼저 만든다
select
  d::date::text as day,
  coalesce(sum(f.amount), 0) as amount
from generate_series(
  (now() at time zone 'Asia/Seoul')::date - 6,
  (now() at time zone 'Asia/Seoul')::date,
  interval '1 day'
) as d
left join funding f
  on (f.paid_at at time zone 'Asia/Seoul')::date = d::date
  and f.status = 'paid'
group by d
order by d;
