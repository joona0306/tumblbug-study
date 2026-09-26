-- SQL 기초 미니 수업 (3주차 5단계)
-- Neon → SQL Editor 에서 **개발용(dev) 브랜치**를 선택하고, 한 덩어리씩 골라서 실행한다.
-- "user"는 SQL에서 특별한 단어라서 항상 큰따옴표로 감싼다.

-- ① 읽기: link 표에서 원하는 칸만, 번호 순으로 5줄
SELECT id, title, url, position
FROM link
ORDER BY id
LIMIT 5;

-- ② 조건: 주소에 youtube 가 들어간 링크만
SELECT title, url
FROM link
WHERE url LIKE '%youtube%';

-- ③ 함정: 따옴표 없는 user 는 "지금 DB에 접속한 계정"이라는 뜻이 된다
SELECT count(*) FROM user;   -- 에러 없이 1 이 나온다 (우리 사용자 표가 아님!)
SELECT count(*) FROM "user"; -- 진짜 가입자 수

-- ④ 합치기(JOIN): 링크마다 주인의 사용자 이름을 붙여서
SELECT u.username, l.title, l.position
FROM link AS l
JOIN "user" AS u ON u.id = l.user_id
ORDER BY u.username, l.position;

-- ⑤ 묶어서 세기(GROUP BY): 사용자별 링크 수 (링크가 0개인 사람도 보이도록 LEFT JOIN)
SELECT u.username, count(l.id) AS link_count
FROM "user" AS u
LEFT JOIN link AS l ON l.user_id = u.id
GROUP BY u.username
ORDER BY link_count DESC;

-- ⑥ 추가(INSERT): 내 계정에 링크 1개 (내_사용자이름 을 바꿔서 실행)
INSERT INTO link (user_id, title, url, position)
SELECT id, 'SQL로 만든 링크', 'https://example.com', 99
FROM "user"
WHERE username = '내_사용자이름'
RETURNING id, title;

-- ⑦ 수정(UPDATE): 방금 만든 링크의 제목 바꾸기 — WHERE 를 절대 빼먹지 말 것!
UPDATE link
SET title = 'SQL로 고친 링크'
WHERE title = 'SQL로 만든 링크'
RETURNING id, title;

-- ⑧ 삭제(DELETE): 실습한 링크 지우기
DELETE FROM link
WHERE title = 'SQL로 고친 링크'
RETURNING id;
