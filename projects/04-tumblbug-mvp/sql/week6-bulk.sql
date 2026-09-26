-- 6주차 6단계: 인덱스 효과를 보기 위한 대량 데이터 (개발 DB 전용!)
-- 프로젝트 20,000개 + 후원 300,000건. 제목이 '[bulk]' 로 시작해서 week6-bulk-cleanup.sql 로 한 번에 지울 수 있다.
-- 먼저 npm run db:seed 로 예시 계정을 만들어 두어야 한다 (창작자·후원자로 쓴다).

insert into project (creator_id, title, summary, category, goal_amount, deadline, image_url, status)
select
  (select id from "user" where email like '%@seed.moa.test' and username is not null order by id limit 1 offset (g % 6)),
  '[bulk] 프로젝트 ' || g,
  '인덱스 실습용 예시 프로젝트',
  (array['living','craft','publishing','music','beauty','game'])[1 + g % 6],
  10000 * (10 + g % 500),
  (now() at time zone 'Asia/Seoul')::date + (g % 90) - 30,
  'https://example.com/bulk.jpg',
  case when g % 90 < 30 then (case when g % 2 = 0 then 'success' else 'failed' end) else 'funding' end
from generate_series(1, 20000) as g;

insert into funding (project_id, supporter_id, amount, order_id, payment_key, status, paid_at)
select
  p.min_id + (g % 20000),
  'seed-supporter-' || (1 + g % 60),
  1000 * (1 + g % 100),
  'bulk-order-' || g,
  case when g % 10 = 0 then null else 'bulk-payment-' || g end,
  case when g % 10 = 0 then 'pending' else 'paid' end,
  case when g % 10 = 0 then null else now() - (g % 30) * interval '1 day' end
from generate_series(1, 300000) as g,
  (select min(id) as min_id from project where title like '[bulk]%') as p;

-- 통계 정보 갱신: PostgreSQL이 "어떤 방법이 빠를지" 판단할 때 쓰는 표 통계를 새로 모은다
analyze project;
analyze funding;
