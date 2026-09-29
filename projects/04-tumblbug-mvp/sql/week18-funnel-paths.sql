-- 18주차: 퍼널을 "사람 한 명씩" 따라가 보기 — 단계별 개수만으로는 안 보이는 것
-- 실행: npm run db:sql -- sql/week18-funnel-paths.sql   (Neon SQL Editor 에 붙여 넣어도 된다, 읽기만 한다)
-- 대상 프로젝트: 가상 사례(npm run ops:simulate). 내 프로젝트를 보려면 아래 target 의 조건을 "where id = 내 프로젝트 번호" 로 바꾼다

-- ① 방문자마다 어느 단계까지 갔는지 한 줄로 모은다 (bool_or = 그 단계 기록이 하나라도 있으면 true)
--    그다음 "배송이 필요한 길"과 "배송 없이 가는 길"을 나눠서 센다
with target as (
  select id from project where title like '[가상 사례]%' order by id desc limit 1
), visitor as (
  select visitor_id,
         bool_or(step = 'reward') as reward,
         bool_or(step = 'shipping') as shipping,
         bool_or(step = 'payment_request') as payment_request,
         bool_or(step = 'paid') as paid
  from funnel_event
  where project_id = (select id from target)
  group by visitor_id
)
select
  count(*) filter (where shipping)                                   as "배송지 도착",
  count(*) filter (where shipping and payment_request)               as "배송지 통과(결제 요청)",
  round(100.0 * count(*) filter (where shipping and payment_request)
        / nullif(count(*) filter (where shipping), 0), 1)            as "배송지 통과율 %",
  count(*) filter (where reward and not shipping)                    as "배송 없는 리워드",
  count(*) filter (where reward and not shipping and payment_request) as "배송 없이 결제 요청"
from visitor;

-- ② 단계별 개수로 본 "결제 요청 ÷ 배송지" (ops:check 가 보여 주는 값) — ①과 비교해 보자
with target as (
  select id from project where title like '[가상 사례]%' order by id desc limit 1
)
select
  count(*) filter (where step = 'shipping')        as "배송지 (단계 개수)",
  count(*) filter (where step = 'payment_request') as "결제 요청 (단계 개수)",
  round(100.0 * count(*) filter (where step = 'payment_request')
        / nullif(count(*) filter (where step = 'shipping'), 0), 1) as "단순 비율 %"
from funnel_event
where project_id = (select id from target);
