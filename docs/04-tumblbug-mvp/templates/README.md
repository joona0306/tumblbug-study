# 4단계 템플릿

4단계(포트폴리오 프로젝트)에서 쓰는 문서 양식과 예시 답안입니다. 내 기획 폴더에 복사해서 채우세요.

| 파일 | 쓰는 때 | 내용 |
|---|---|---|
| `01-interview-guide.md` | 1주차 | 인터뷰 대상·섭외 메시지·진행 규칙·질문지·기록 양식·정리법 |
| `02-interview-synthesis-example.md` | 1주차 | 인터뷰 정리 예시 (**가상 사례**) — 인용 묶기 → 인사이트 → 설계 영향 |
| `03-prd.md` | 2주차 | PRD 예시 답안 — 문제·사용자·목표/비목표·사용자 스토리와 인수 조건·지표·위험 |
| `04-adr.md` | 2주차~ | 결정 기록 양식 + 예시 4개 (모금 상태 계산, 결제 시점, 초과 판매 방지, 브라우저 상태 도구) + 상태 전이도 |
| `07-data-model.md` | 2~6주차 | 개념 ERD(2주차) → 화면-데이터 매핑표(3~4주차) → 물리 ERD(6주차), 범위 판단·정규화 예시 |
| `05-pr-checklist.md` | 5주차~ | PR 본문 양식 + 합치기 전 셀프 리뷰 체크리스트 |
| `08-incident-review.md` | 15주차~ | 장애 회고 양식 — 알림이 온 날·복구 연습한 날 1건씩 (탓하지 않고 구조에서 원인 찾기) |
| `06-case-study.md` | 20주차 | 포트폴리오용 케이스 스터디 양식 |

## Figma 예시 파일 (3~4주차)
[크라우드펀딩 MVP — 디자인 시스템 & 시안 (예시 v2)](https://www.figma.com/design/NkCzzAJnAtFvzA2iKw19nc)

페이지 순서가 곧 실무 순서입니다.

| 페이지 | 내용 |
|---|---|
| Flow | 사용자 흐름도(후원자·창작자) + 상태 전이도(프로젝트·결제) + 개념 ERD |
| Wireframes | 저해상도 와이어프레임 3장 (홈·상세·후원 1단계) |
| Foundations | 색 토큰 22개(Light/Dark, 텍스트 대비 모두 4.5 이상), 글자 9단계(Noto Sans KR), 간격 7단계, 모서리 4단계, 그림자 2개 |
| Icons | Lucide 아이콘 24개 (코드에서는 lucide-react의 같은 이름) |
| Button ~ Toast | 컴포넌트 19종 — Button(종류×크기×상태 24), Input(기본·포커스·에러·비활성), Badge(D-day 포함), ProgressBar, ProjectCard/Row, Chip, Tab, QuantityStepper, LikeButton, RewardCard(기본·선택·품절), Steps, AppHeader, PageHeader, BottomBar, Toast, Logo, MenuRow, ThemeOption(14주차 마이페이지) |
| Screens | 모바일 14개(M14 마이페이지 — 14주차 추가) + 데스크톱 3개 + Dark 모드 2개, 클릭 프로토타입(홈 → 상세 → 후원 1·2·3단계 → 완료) |
| Archive — v1 | 개선 전 시안 (전후 비교용) |

- 브랜드 "모아"와 프로젝트 내용은 가상입니다. 사진은 Unsplash(Unsplash License), 아이콘은 Lucide(ISC)
- 토큰 이름 = 코드의 CSS 변수 이름 (`color/primary` → `var(--color-primary)`, `spacing/lg` → `var(--spacing-lg)`). 5주차에 그대로 옮깁니다
- 시안 속 주석(💡)은 상태를 어디에 두는지(URL·Zustand·Context) 설명입니다 — 실제 화면에는 넣지 않습니다
- 시안의 입력 규칙(후원 1,000~1,000,000원 등)은 코드의 zod 검사와 같은 문장이어야 합니다
