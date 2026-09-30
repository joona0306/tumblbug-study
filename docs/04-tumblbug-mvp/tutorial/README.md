# 4단계 HTML 교재 — 모아 (텀블벅 클론)

`index.html`을 더블클릭해서 브라우저로 열면 됩니다.

| 파일 | 내용 |
|---|---|
| `index.html` | 시작 페이지: 읽는 법(그림 먼저 → 따라 하기 → 방금 무슨 일이 → 스스로 확인), 전체 구조, 20주 목차, 완료 기준 |
| `week1~4.html` | 기획·UX: 경쟁 분석·인터뷰 / PRD·ADR·개념 ERD / 흐름도·와이어프레임·화면-데이터 매핑 / 디자인 시스템·시안·프로토타입 |
| `week5~13.html` | 구현: 프로젝트 준비 / DB·SQL / 인증·등록 / 리워드·상태 / API / 후원 단계 / 결제·초과 판매 방지 / 찜 / 대시보드·관리자·예약 작업 |
| `week14~16.html` | 배포·운영 준비: CD 파이프라인 / 운영 준비 / Docker·AWS EC2 |
| `week17~20.html` | 운영·개선 (강의 뒤 직접, 교재는 [가상] 사례로 시연): 운영 시작 / 우선순위 / 개선 한 바퀴 / 케이스 스터디·운영 종료 |

정답 코드와 안내서: `projects/04-tumblbug-mvp/` (`docs/*.md`, `docs/case-study/`).

## 작성자용: 코드 블록 동기화
```bash
node tools/sync-tutorial-code.mjs docs/04-tumblbug-mvp/tutorial projects/04-tumblbug-mvp
```
- 4단계 태그: `tumblbug-week5-step1` … `tumblbug-week15-…`, `week16-step1`~`week20-step1`
- 그림은 글자 그림(`<pre>`) 대신 `.flow` 상자로 그린다 — 한글 폭 때문에 글자 그림은 줄이 어긋난다
