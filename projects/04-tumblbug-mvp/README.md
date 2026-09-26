# 04-tumblbug-mvp — 모아 (크라우드펀딩 MVP)

4단계 포트폴리오 프로젝트의 정답 코드입니다. 기획서: `docs/04-tumblbug-mvp/PLAN.md`
교재의 각 단계는 git 태그(`tumblbug-week5-step1` …)로 남아 있습니다.

## 실행
```bash
npm install
cp .env.example .env.local   # 값은 비워 둬도 실행된다
npm run dev                  # http://localhost:3000
```

## 자주 쓰는 명령
| 명령 | 하는 일 |
|---|---|
| `npm run lint` | 코드 검사 (ESLint) |
| `npm run typecheck` | 타입 검사 (TypeScript) |
| `npm test` | 단위 테스트 (Vitest) — 금액 계산, 환경 변수, Figma 토큰 일치 |
| `npm run test:e2e` | 흐름 테스트 (Playwright) — 처음 한 번 `npx playwright install chromium` |
| `npm run build` | 운영용 빌드 |
| `npm run db:generate -- --name 이름` | 표 설계(db/schema.ts)가 바뀌면 마이그레이션 파일 만들기 |
| `npm run db:migrate` | 마이그레이션을 DB에 적용 |
| `npm run db:seed` | 개발용 예시 데이터 (_dev/_test DB에서만). 계정 비밀번호는 `scripts/seed.mts` 의 SEED_PASSWORD |
| `npm run db:sql -- sql/파일.sql` | SQL 파일 실행 (_dev/_test DB에서만) |
| `npm run db:studio` | 브라우저에서 표 내용 보기 (Drizzle Studio) |

CI(`.github/workflows/ci.yml`)가 위 명령을 PR마다 자동으로 돌린다.

## 폴더
| 폴더 | 내용 |
|---|---|
| `app/` | 화면(페이지)과 API |
| `components/ui/` | Figma 디자인 시스템과 같은 이름의 부품 |
| `lib/` | 계산·검사 함수 (옆에 `*.test.ts`), `lib/queries/` DB 조회 |
| `db/` | 표 설계도(schema.ts)와 DB 연결 / `drizzle/` 마이그레이션 기록 |
| `sql/` | 직접 쓴 SQL (통계·실행 계획·대량 실습 데이터) |
| `tests/db/` | 진짜 DB로 하는 테스트 (제약 조건·통계·트랜잭션) |
| `e2e/` | 흐름 테스트 |
| `design/figma-tokens.json` | Figma에서 내보낸 토큰 값 (`tests/tokens.test.ts`가 CSS와 비교) |
| `docs/state-map.md` | 상태 관리 지도 — 어떤 값을 어디에 두는지 |
| `docs/adr/` | 결정 기록 (ADR-005 DB 드라이버) |
| `docs/explain.md` | 인덱스 전후 실행 계획 비교 |

## 개발용 확인 페이지
- `/design-system` — 부품 미리보기
- `/debug/sentry` — Sentry 연결 확인 (테스트 에러)
