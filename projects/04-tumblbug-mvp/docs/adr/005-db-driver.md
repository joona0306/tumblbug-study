# ADR-005: DB 드라이버를 무엇으로 할까
- 상태: 결정
- 날짜: 2026-09-26 (4단계 6주차)

## 상황
1~3단계는 Neon 전용 HTTP 드라이버(`@neondatabase/serverless`의 `neon()`)를 썼다. 4단계에는 새 요구가 생겼다.
- 11주차 결제: 수량 차감·후원 확정을 **트랜잭션**으로 묶어야 한다
- CI: 매번 깨끗한 DB에서 **진짜 DB 테스트**를 돌리고 싶다 (GitHub Actions의 PostgreSQL 컨테이너)
- 16주차: 같은 앱을 Docker로 EC2에 올린다 (일반 PostgreSQL에도 붙을 수 있어야 함)

## 선택지
1. **Neon HTTP 드라이버 유지** — 설정 간단, 서버리스 첫 요청이 빠름 / 트랜잭션 불가, Neon에만 붙음
2. **Neon Pool(WebSocket) 드라이버** — 트랜잭션 가능 / 여전히 Neon 전용이라 CI·Docker의 일반 PostgreSQL에 바로 붙지 않음
3. **표준 PostgreSQL 드라이버 `pg` + Pool** — 트랜잭션 가능, Neon·CI·Docker 어디든 같은 코드 / 서버리스에서 연결 수 관리 필요

## 결정
3번 `pg` (drizzle-orm/node-postgres). Neon은 풀러 주소(`-pooler`)를 쓰고, 함수 하나당 Pool 크기는 5로 작게 둔다.

## 이유
- 세 요구를 모두 만족하는 유일한 선택지
- "표준 드라이버"라서 배운 내용이 다른 PostgreSQL 서비스(AWS RDS 등)에도 그대로 통한다

## 결과
- DB 주소의 `sslmode=require` → `sslmode=verify-full` 로 바꾼다 (`pg` 8.20+ 보안 경고. 인증서까지 확인하는 가장 엄격한 모드)
- proxy.ts(Next.js 16, 옛 미들웨어)는 Node.js에서 돌아 DB에 붙을 수는 있지만, 공식 권장대로 가볍게 쿠키만 확인하고 DB 확인은 페이지·서버 액션(requireUser)에서 한다 (7주차)
- 1~3단계와 드라이버가 달라진 이유를 교재에서 설명한다
