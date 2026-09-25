-- 성공 지표: "가입한 사람 중 링크를 1개 이상 등록한 사람의 비율"
-- Neon → SQL Editor 에서 운영(production) 브랜치를 선택하고 실행한다.
SELECT
  count(*) AS 가입자_수,
  count(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM link WHERE link.user_id = "user".id)
  ) AS 링크_등록자_수,
  round(
    100.0 * count(*) FILTER (
      WHERE EXISTS (SELECT 1 FROM link WHERE link.user_id = "user".id)
    ) / nullif(count(*), 0),
    1
  ) AS 등록_비율_퍼센트
FROM "user";
