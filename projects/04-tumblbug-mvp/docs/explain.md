# 인덱스 전후 실행 계획 비교 (6주차 6단계)

- 측정: 2026-09-26, Neon PostgreSQL 18.6 (tumblbug_dev), 프로젝트 20,008개 · 후원 300,600건 (`sql/week6-bulk.sql`)
- 방법: `npm run db:sql -- sql/week6-explain.sql` 을 인덱스 추가 전·후에 실행 (마이그레이션 `0003_list_and_stats_indexes`)
- 추가한 인덱스
  - `project_status_deadline_idx (status, deadline)` — 거르는 칸을 앞에, 정렬하는 칸을 뒤에
  - `funding_project_status_idx (project_id, status)` — "이 프로젝트의 결제 완료 후원"

| 쿼리 | 인덱스 전 | 인덱스 후 | 차이 |
|---|---|---|---|
| ① 목록: 모금 중, 마감 임박순 20개 | Seq Scan (2만 줄 전부 읽고 정렬) · **12.146ms** · 514 블록 | Index Scan (인덱스 순서대로 20개만) · **0.103ms** · 22 블록 | 약 118배 |
| ② 상세: 한 프로젝트의 모인 금액 | Parallel Seq Scan (30만 줄 중 15줄 찾으려 전부) · **40.930ms** · 5,097 블록 | Bitmap Index Scan (15줄만) · **0.159ms** · 22 블록 | 약 257배 |

## 읽는 법
- **Seq Scan**: 표를 처음부터 끝까지 훑는다. 데이터가 늘수록 비례해서 느려진다
- **Index Scan / Bitmap Index Scan**: 인덱스(찾아보기)로 필요한 줄만 찾아간다. 데이터가 늘어도 거의 그대로
- **Buffers**: 읽은 데이터 블록 수(1블록 = 8KB). 적을수록 좋다
- ①은 인덱스가 이미 `deadline` 순서로 정렬되어 있어서 **정렬(Sort) 단계가 사라졌다**

## 대가
- 인덱스도 저장 공간을 쓰고, 후원이 들어올 때마다 인덱스도 함께 고쳐야 해서 **쓰기는 조금 느려진다**
- 그래서 모든 칸에 달지 않고 "자주, 많이 읽는 조건"에만 단다
