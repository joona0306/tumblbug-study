-- 운영 점검: 결제가 왜 실패했나?
-- 1) 실패 이유별 건수 (가장 많은 것부터)
SELECT fail_reason AS 실패_이유, count(*) AS 건수
FROM support
WHERE status = 'failed'
GROUP BY fail_reason
ORDER BY 건수 DESC;

-- 2) 30분 넘게 pending 인 주문 = 결제창에서 브라우저를 닫는 등 중간에 사라진 것으로 추정
SELECT count(*) AS 중간에_사라진_주문
FROM support
WHERE status = 'pending' AND created_at < now() - interval '30 minutes';
