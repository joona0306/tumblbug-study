# 계정 정리 — 어디서 어떤 계정으로 로그인하나

> 환경(DB)마다 계정이 **따로** 있다. 개발 DB 의 계정으로 운영 사이트에 로그인할 수 없다.
> 비밀번호는 DB 에 암호화(해시)되어 저장돼서 **누구도 다시 꺼내 볼 수 없다** — 잊으면 새로 만들거나 바꿔야 한다.

## 환경별 한눈에

| 환경 | 주소 | DB | 계정 |
|---|---|---|---|
| 내 컴퓨터 개발 (`npm run dev`) | http://localhost:3000 | Neon 개발 `tumblbug_dev` | **예시 계정** (아래 표) |
| 내 컴퓨터 Docker (`docker compose up`) | http://localhost:3000 | 컨테이너 안 PostgreSQL `moa_dev` | **예시 계정** |
| PR 미리보기 (Vercel) | PR 댓글의 주소 | 개발 DB 복사본 `preview/pr-N` | **예시 계정** |
| 운영 (Vercel) | https://tumblbug-study.vercel.app | Neon 운영 `moa-prod` | **예시 계정 없음** — 운영에서 직접 가입한 계정만 |

## 예시 계정 (개발·Docker·미리보기 전용)

`npm run db:seed` 가 만든다 (`scripts/seed.mts`). 비밀번호는 모두 **`moa-dev-1234`** — 예시 데이터 전용이라 저장소에 공개돼 있어도 괜찮다. **운영에는 절대 쓰지 않는다.**

| 이메일 | 이름 | 역할 | 이럴 때 쓴다 |
|---|---|---|---|
| `moa_admin@seed.moa.test` | 모아 관리자 | **관리자** | 관리자 화면(`/admin`), 프로젝트 숨기기 |
| `supporter_kim@seed.moa.test` | 김모아 | 후원자 | 후원하기, 내 후원 내역, 찜 |
| `supporter_lee@seed.moa.test` | 이응원 | 후원자 | 두 번째 후원자가 필요할 때 |
| `supporter_park@seed.moa.test` | 박후원 | 후원자 | 세 번째 후원자가 필요할 때 |
| `ohneul_workshop@seed.moa.test` | 오늘의공방 | 창작자 | 창작자 스튜디오, 후원자 목록·배송지 |
| `heuk_bul@seed.moa.test` | 흙과불 | 창작자 | |
| `golmok_photo@seed.moa.test` | 골목사진관 | 창작자 | |
| `slow_traveler@seed.moa.test` | 느린여행자 | 창작자 | |
| `band_3am@seed.moa.test` | 밴드 새벽세시 | 창작자 | |
| `green_hand@seed.moa.test` | 초록손 | 창작자 | |

- 가상 사례(`npm run ops:simulate`, 17~20주차 예시)가 만드는 `…@sim.moa.test` 계정은 비밀번호가 없다 — 로그인용이 아니다
- 흐름 테스트(Playwright)가 잠깐 만드는 `…@e2e.moa.test`, 부하 테스트가 만드는 `…@loadtest.moa.test` 계정은 테스트가 끝나면 지워진다 — 로그인용이 아니다

## 운영 계정 (운영 사이트에서 직접 가입한 것)

운영 DB 에 어떤 계정이 있는지 보려면 — Neon 콘솔 → **운영 프로젝트(`moa-prod`)** → **SQL Editor** (읽기만 한다):
```sql
select email, name, role, created_at from "user" order by created_at;
```
- 각 계정이 만든 프로젝트까지 보려면:
```sql
select u.email, p.id, p.title, p.hidden from project p join "user" u on u.id = p.creator_id order by p.id;
```
- **비밀번호를 잊었으면**: 이 앱에는 아직 "비밀번호 찾기"가 없다 → 새 이메일로 다시 가입한다 (연습용 계정이면 그게 가장 간단하다)
- **관리자 만들기**: 운영에서 내가 쓸 계정 하나만 관리자로 (docs/deploy.md "운영 DB 첫 관리자 만들기"):
```sql
update "user" set role = 'admin' where email = '내이메일@example.com';
```

## 비밀번호 보관 규칙
- 운영에서 만든 내 계정의 비밀번호는 **비밀번호 관리자**(브라우저 저장, 1Password 등)에 둔다 — 이 문서·채팅·저장소에 적지 않는다
- 운영 계정을 새로 만들면 이 문서의 표가 아니라 비밀번호 관리자에 "모아 운영 — 관리자" 처럼 이름을 붙여 저장한다
