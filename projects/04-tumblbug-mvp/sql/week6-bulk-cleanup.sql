-- 대량 실습 데이터 지우기 (후원 → 프로젝트 순서: 후원이 프로젝트를 가리키므로 자식부터)
delete from funding where order_id like 'bulk-order-%';
delete from project where title like '[bulk]%';
analyze project;
analyze funding;
