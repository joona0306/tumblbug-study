-- 성공 지표: 등록된 상품 중 거래완료로 바뀐 비율
-- Neon → SQL Editor 에서 운영(production) 브랜치를 선택하고 실행한다.
SELECT
  count(*) AS 등록_상품,
  count(*) FILTER (WHERE status = 'sold') AS 거래완료,
  round(100.0 * count(*) FILTER (WHERE status = 'sold') / nullif(count(*), 0), 1) AS 거래완료율_퍼센트
FROM product;

-- 함께 보면 좋은 숫자: 카테고리별 등록 수와 거래완료 수
SELECT
  category AS 카테고리,
  count(*) AS 등록,
  count(*) FILTER (WHERE status = 'sold') AS 거래완료
FROM product
GROUP BY category
ORDER BY 등록 DESC;
