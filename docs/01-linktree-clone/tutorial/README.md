# 1단계 HTML 교재 — Linktree 클론

`index.html`을 더블클릭해서 브라우저로 열면 됩니다. 인터넷 연결 없이도 열립니다.

| 파일 | 내용 |
|---|---|
| `index.html` | 시작 페이지: 완성본 미리보기, 전체 구조 흐름도, 준비물 체크리스트 |
| `week1.html` | 1주차 기획·디자인: 경쟁 서비스 분석, 기능 목록, 성공 지표, 와이어프레임, 디자인 결정(토큰·대비) (코드 없음) |
| `week2.html` | 2주차: 프로젝트 생성 → Neon DB → 테이블(ERD) → 회원가입·로그인(흐름도) → 접근 제한 |
| `week3.html` | 3주차: 링크 추가·수정·삭제, 서버 검사, 공개 페이지, 로그아웃 |
| `week4.html` | 4주차: 배포 준비, GitHub, DB 분리, Vercel 배포, 사용량 측정, 운영 루프, 사용성 테스트·접근성, 지표 기반 개선(흐름도), 완료 기준 |
| `style.css`, `app.js` | 공용 디자인(라이트/다크)과 기능(진행률 저장, 코드 복사) |

## 작성자용: 코드 블록 동기화
교재의 코드 블록은 `projects/01-linktree-clone`의 git 태그(`linktree-week2-step1` …)에서
자동으로 채워집니다. 정답 코드를 고치고 태그를 옮긴 뒤, 저장소 최상위에서 실행하세요.

```bash
node tools/sync-tutorial-code.mjs docs/01-linktree-clone/tutorial projects/01-linktree-clone
```

체크박스(`data-task`)를 추가·삭제했을 때도 이 명령으로 `app.js`의 진행률 목록이 갱신됩니다.
