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

CI(`.github/workflows/ci.yml`)가 위 명령을 PR마다 자동으로 돌린다.

## 폴더
| 폴더 | 내용 |
|---|---|
| `app/` | 화면(페이지)과 API |
| `components/ui/` | Figma 디자인 시스템과 같은 이름의 부품 |
| `lib/` | 계산·검사 함수 (옆에 `*.test.ts`) |
| `e2e/` | 흐름 테스트 |
| `design/figma-tokens.json` | Figma에서 내보낸 토큰 값 (`tests/tokens.test.ts`가 CSS와 비교) |
| `docs/state-map.md` | 상태 관리 지도 — 어떤 값을 어디에 두는지 |

## 개발용 확인 페이지
- `/design-system` — 부품 미리보기
- `/debug/sentry` — Sentry 연결 확인 (테스트 에러)
