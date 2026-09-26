# 04-tumblbug-mvp — 모아 (크라우드펀딩 MVP)

4단계 포트폴리오 프로젝트의 정답 코드입니다. 기획서: `docs/04-tumblbug-mvp/PLAN.md`
교재의 각 단계는 git 태그(`tumblbug-week5-step1` …)로 남아 있습니다.

## 실행
```bash
npm install
npm run dev        # http://localhost:3000
```

## 자주 쓰는 명령
| 명령 | 하는 일 |
|---|---|
| `npm run lint` | 코드 검사 (ESLint) |
| `npm run typecheck` | 타입 검사 (TypeScript) |
| `npm run build` | 운영용 빌드 |

## 디자인 토큰
- `app/globals.css`의 CSS 변수 이름 = Figma 변수 이름 (`color/primary` → `--color-primary`)
- `design/figma-tokens.json` = Figma에서 내보낸 값. 둘이 같은지 테스트가 확인한다 (3단계부터)
