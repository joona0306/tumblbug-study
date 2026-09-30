# 4단계 HTML 교재 — 모아 (텀블벅 클론)

`index.html`을 더블클릭해서 브라우저로 열면 됩니다.

| 파일 | 내용 |
|---|---|
| `index.html` | 시작 페이지: 읽는 법(그림 먼저 → 따라 하기 → 방금 무슨 일이 → 스스로 확인), 전체 구조, 20주 목차, 완료 기준 |
| `week16.html` | 16주차 (먼저 공개된 견본): Docker 준비(Windows 10·11) · Dockerfile · compose · AWS 요금 안전장치 · EC2 · HTTPS · 자동 배포 · 롤백 · 부하 테스트 · 정리 |

나머지 주차는 차례로 추가한다. 정답 코드와 안내서: `projects/04-tumblbug-mvp/` (`docs/*.md`, `docs/case-study/`).

## 작성자용: 코드 블록 동기화
```bash
node tools/sync-tutorial-code.mjs docs/04-tumblbug-mvp/tutorial projects/04-tumblbug-mvp
```
- 4단계 태그: `tumblbug-week5-step1` … `tumblbug-week15-…`, `week16-step1`~`week20-step1`
- 그림은 글자 그림(`<pre>`) 대신 `.flow` 상자로 그린다 — 한글 폭 때문에 글자 그림은 줄이 어긋난다
