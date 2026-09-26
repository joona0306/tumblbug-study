-- 6주차 6단계: 실행 계획 보기. 인덱스를 넣기 전과 후에 똑같이 실행해서 비교한다.
-- EXPLAIN ANALYZE = 실제로 실행해 보고 "어떤 방법으로, 몇 ms 걸렸는지" 보여준다
--   Seq Scan   = 표 전체를 처음부터 끝까지 훑음 (책을 첫 쪽부터 넘기며 찾기)
--   Index Scan = 인덱스(색인)로 바로 찾아감 (책 뒤의 찾아보기로 쪽수 바로 찾기)

-- ① 목록 첫 화면: 모금 중인 프로젝트를 마감 임박순으로 20개
explain analyze
select id, title, deadline
from project
where status = 'funding' and hidden = false
  and deadline >= (now() at time zone 'Asia/Seoul')::date
order by deadline
limit 20;

-- ② 상세 화면: 한 프로젝트의 모인 금액 (결제 완료만)
explain analyze
select coalesce(sum(amount), 0)
from funding
where project_id = (select max(id) from project) and status = 'paid';
