-- 성공 지표: "결제를 시작한 후원 중 끝까지 완료된 비율"
-- (후원하기 버튼을 누르면 pending 줄이 1개 생긴다 → 완료되면 paid)
-- Neon → SQL Editor 에서 운영(production) 브랜치를 선택하고 실행한다.
SELECT
  count(*) AS 결제_시도,
  count(*) FILTER (WHERE status = 'paid') AS 결제_완료,
  round(100.0 * count(*) FILTER (WHERE status = 'paid') / nullif(count(*), 0), 1) AS 완료율_퍼센트
FROM support;
