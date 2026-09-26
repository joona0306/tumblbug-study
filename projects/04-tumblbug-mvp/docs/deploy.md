# 배포 설정 — Vercel CD 파이프라인 (14주차)

> 목표: **CI 를 통과한 코드만** 배포된다. PR 마다 미리보기 주소 + 미리보기 DB 가 생겼다가 PR 을 닫으면 사라진다.
> main 에 합치면 (승인 후) 운영 DB 마이그레이션 → 운영 배포 → 연기 테스트 → Sentry 릴리스 기록 순서로 자동 진행된다.
> 파이프라인 파일: `.github/workflows/cd.yml` (CI 는 `ci.yml` 을 불러서 먼저 돌린다)

```
PR 열기/고치기 ─▶ CI ─▶ Neon 브랜치 preview/pr-N ─▶ 마이그레이션 ─▶ vercel deploy (미리보기) ─▶ 연기 테스트 ─▶ PR 댓글
PR 닫기       ─▶ Neon 브랜치 삭제
main 에 합치기 ─▶ CI ─▶ [승인] ─▶ 운영 DB 마이그레이션 ─▶ vercel deploy --prod ─▶ 운영 주소 연기 테스트 ─▶ Sentry 릴리스
```

**비밀값 규칙**: 아래에서 만드는 토큰·키·DB 주소는 **채팅·코드·스크린샷에 붙여 넣지 않는다.** GitHub·Vercel 설정 화면에만 넣는다.

---

## 0. 지역(region) 정하기

함수(Vercel)와 DB(Neon)는 **같은 지역**에 둔다. 멀면 쿼리마다 왕복 시간이 붙는다 (한 화면에 쿼리 5개면 5배).

- DB: Neon **AWS Asia Pacific (Singapore)** — 개발 DB 와 같은 곳
- 함수: `vercel.json` 의 `"regions": ["sin1"]` (싱가포르) — 이미 적혀 있다

## 1. Neon — 운영 DB 따로 만들기

운영 DB 는 **개발용과 다른 Neon 프로젝트**에 만든다.
미리보기 DB 브랜치는 "프로젝트 전체 복사"라서, 같은 프로젝트에 운영 DB 가 있으면 운영 데이터(배송지 등 개인정보)까지 미리보기로 복사되기 때문이다.

1. Neon 콘솔 → **New Project** → 이름 `moa-prod`, Postgres 18, 지역 **Singapore**
2. **Connect** → Database 는 기본(`neondb`) 그대로, 두 주소를 복사해 둔다 (메모장에 잠깐, 끝나면 지운다)
   - **Connection pooling 켠 주소** → Vercel 운영 `DATABASE_URL` (앱이 쓴다)
   - **Connection pooling 끈 주소** → GitHub `production` 환경의 `DATABASE_URL` (마이그레이션이 쓴다)
   - 두 주소 모두 끝의 `sslmode=require` 를 `sslmode=verify-full` 로 바꾼다 (6주차와 같은 이유)
3. 개발용 프로젝트(지금 쓰는 것)로 돌아가서:
   - **Settings → General → Project ID** 복사 → GitHub 변수 `NEON_PROJECT_ID`
4. 계정 메뉴 → **Account settings → API keys → Create new API key** (이름 `github-actions`) → GitHub 비밀값 `NEON_API_KEY`
   - 이 키로 미리보기 브랜치를 만들고 지운다. 한 번만 보여 주므로 바로 GitHub 에 넣는다.

## 2. Vercel — 프로젝트 만들기

1. Vercel → **Add New… → Project** → GitHub 저장소 **Import**
   - 교재 저장소처럼 앱이 하위 폴더에 있으면 **Root Directory** = `projects/04-tumblbug-mvp`
   - Framework: Next.js (자동)
   - 처음 한 번은 Vercel 이 바로 빌드를 시도하다 실패할 수 있다 (아직 환경 변수가 없어서) — 괜찮다.
     그 뒤로는 `vercel.json` 의 `"git": { "deploymentEnabled": false }` 때문에 Vercel 이 스스로 배포하지 않는다. 배포는 GitHub Actions 만 한다.
2. **Storage → Blob** → 7주차에 만든 저장소를 이 프로젝트에 **Connect**
   - 뜨는 창에서 넣을 환경을 **직접 체크**한다: **Production**·**Preview** ✅ (Development 는 필요 없다 — 내 컴퓨터는 `.env.local` 에 이미 있다)
   - 확인을 누르면 체크한 환경에 `BLOB_READ_WRITE_TOKEN` 이 추가된다 (토큰 값을 복사해 붙여 넣을 필요는 없다)
   - **Settings → Environment Variables** 에 `BLOB_READ_WRITE_TOKEN` 이 Production·Preview 로 보이면 성공
3. **Settings → Environment Variables** — 최종 모습은 이렇다

   | 이름 | Type | Production | Preview | 값 |
   |---|---|---|---|---|
   | `DATABASE_URL` | Secret | ✅ | ❌ **넣지 않는다** | 1-2 의 pooling 켠 운영 주소 (미리보기는 PR 마다 CD 가 넣는다) |
   | `CRON_SECRET` | Secret | ✅ | ❌ | 새 무작위 값 (예약 작업 보호) |
   | `BETTER_AUTH_SECRET` | Secret | ✅ | ✅ | 새 무작위 값 — 개발용(`.env.local`)과 **다르게** |
   | `TOSS_SECRET_KEY` | Secret | ✅ | ✅ | 토스 **테스트** 시크릿 키 (`test_gsk_…`) |
   | `BETTER_AUTH_URL` | Config | ✅ | ❌ **넣지 않는다** | 운영 주소 `https://프로젝트이름.vercel.app` (미리보기는 배포 주소를 자동으로 쓴다) |
   | `NEXT_PUBLIC_SENTRY_DSN` | Config | ✅ | ✅ | 5주차 DSN |
   | `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Config | ✅ | ✅ | 토스 **테스트** 클라이언트 키 (`test_gck_…`) |

   - **Type**: Secret = 저장 후 다시 볼 수 없음 (비밀번호·키·토큰) / Config = 저장 후에도 보임 (비밀이 아닌 값).
     `NEXT_PUBLIC_` 으로 시작하는 값은 어차피 브라우저로 보내지는 공개 값이라 Config.
   - 무작위 값 만들기: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

   **넣는 방법** — "Add Environment Variable" 창 하나에서는 Type 과 Environments 를 **한 가지로만** 고를 수 있다.
   그래서 위 표를 Type·환경이 같은 것끼리 묶어 **창을 4번** 연다:

   | 번 | Type | Environments | 넣을 변수 |
   |---|---|---|---|
   | ① | Secret | Production | `DATABASE_URL`, `CRON_SECRET` |
   | ② | Secret | Production, Preview | `BETTER_AUTH_SECRET`, `TOSS_SECRET_KEY` |
   | ③ | Config | Production | `BETTER_AUTH_URL` |
   | ④ | Config | Production, Preview | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_TOSS_CLIENT_KEY` |

   - 한 창에 변수 여러 개: Key·Value 를 채운 뒤 **+ Add new variable** 로 줄을 늘린다
   - 환경 여러 개 고르기: **Environments** 드롭다운 → **Environments ›** (한 단계 더 들어간다) → Production·Preview 체크
   - **Save** 를 눌러야 저장된다. 목록에 7개가 모두 보이고 환경 표시(Production / Production and Preview)가 위 표와 같으면 끝
   - `Import .env` 로 `.env.local` 을 통째로 불러오지 않는다 — 개발용 값(개발 DB 주소, `localhost` 주소)이 운영에 들어간다
4. **Settings → Deployment Protection → Protection Bypass for Automation → Add** → 만들어진 값 → GitHub 비밀값 `VERCEL_AUTOMATION_BYPASS_SECRET`
   (미리보기 주소는 로그인한 사람만 볼 수 있게 막혀 있다 → 연기 테스트가 이 값을 헤더로 보내 통과한다)
5. **Settings → General** → **Project ID** 복사 → GitHub 비밀값 `VERCEL_PROJECT_ID`
6. 팀 **Settings → General → Team ID** (`team_…` 으로 시작) → GitHub 비밀값 `VERCEL_ORG_ID`
   - 요즘 Vercel 은 개인 무료(Hobby) 계정도 "OO's projects" 라는 **팀** 안에 프로젝트를 만든다 → 계정 설정의 "Your ID"(개인 ID)가 아니라 **팀 ID** 를 넣는다
   - 개인 ID 를 넣으면 파이프라인이 `Could not retrieve Project Settings` 로 멈춘다
7. 계정 **Settings → Tokens → Create** (이름 `github-actions`, 만료: 90일 등) → GitHub 비밀값 `VERCEL_TOKEN`
   - **Scope: 팀 이름(예: `Andrew's projects`) → All Projects** 를 고른다
   - ⚠️ 프로젝트 하나(예: `tumblbug-study`)만 고르면 안 된다 — Vercel CLI(`vercel pull`)는 프로젝트와 함께 **팀 정보**도 읽는데,
     프로젝트 하나로 제한한 토큰은 팀 정보를 볼 수 없어 `Could not retrieve Project Settings` 로 멈춘다
     (API 로 프로젝트만 조회하면 200 이 나와서 원인을 찾기 어렵다 — 14주차에 실제로 겪음)
   - `Full Account` 는 다른 팀까지 모두 다룰 수 있어 권한이 너무 넓다 → 팀 하나(All Projects)가 알맞다
8. 운영 주소를 확인해 둔다: **Settings → Domains** 의 `프로젝트이름.vercel.app` → GitHub `production` 환경 변수 `PRODUCTION_URL`

## 3. Sentry — 릴리스 기록용 값

5주차에 `.env.local` 에 넣은 값과 같다.
- 비밀값 `SENTRY_AUTH_TOKEN`, 변수 `SENTRY_ORG`, 변수 `SENTRY_PROJECT`

## 4. GitHub — 비밀값·변수·환경

저장소 → **Settings → Secrets and variables → Actions**

- **Secrets** 탭 → New repository secret
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `NEON_API_KEY`, `SENTRY_AUTH_TOKEN`
- **Variables** 탭 → New repository variable
  `NEON_PROJECT_ID`, `SENTRY_ORG`, `SENTRY_PROJECT` (그리고 맨 마지막에 `DEPLOY_ENABLED`)

저장소 → **Settings → Environments → New environment** → 이름 `production`

- **Environment secrets**: `DATABASE_URL` = 1-2 의 **pooling 끈** 운영 주소
- **Environment variables**: `PRODUCTION_URL` = `https://프로젝트이름.vercel.app`
- **Required reviewers**: 나를 지정 → main 에 합칠 때마다 "Review deployments" 에서 승인해야 운영 배포가 시작된다
  - ⚠️ 비공개(private) 저장소는 GitHub 유료 요금제에서만 승인자를 지정할 수 있다. 포트폴리오 저장소를 공개로 두면 무료로 쓸 수 있다.
    비공개로 두면 승인 없이 바로 배포된다 (나머지는 똑같이 동작).
- **Deployment branches**: `main` 만 (다른 브랜치가 운영 비밀값을 쓰지 못하게)

## 5. 스위치 켜기

모든 값을 넣었으면 저장소 변수 `DEPLOY_ENABLED` = `true` 를 추가한다.
이 값이 없으면 파이프라인은 CI 만 돌고 배포 단계는 건너뛴다 (설정 도중에 빨간 X 가 쌓이지 않게).

## 6. 확인

1. 작은 변경으로 브랜치 → PR → Actions 에서 `CI/CD` 가 CI → preview 순서로 도는지, PR 에 미리보기 주소 댓글이 달리는지
2. 미리보기 주소에서 예시 계정으로 로그인해 본다 (미리보기 DB = 개발 DB 복사본)
3. PR 을 합친다 → (승인) → production 이 끝나면 운영 주소의 `/api/health` 에서 `commit` 이 합친 커밋인지
4. PR 이 닫히면 Neon 콘솔의 Branches 에서 `preview/pr-N` 이 사라졌는지

## 운영 DB 첫 관리자 만들기

운영 DB 에는 예시 데이터가 없다 (시드는 `_dev`·`_test` DB 에서만 돈다). 운영 주소에서 회원가입한 뒤,
Neon 콘솔(moa-prod) → **SQL Editor** 에서 내 계정만 관리자로 바꾼다:

```sql
update "user" set role = 'admin' where email = '내이메일@example.com';
```

## 🆘 막혔을 때

| 증상 | 원인·해결 |
|---|---|
| `Error: Could not retrieve Project Settings` | ① 토큰 Scope 를 프로젝트 하나로 제한함 → 팀 → All Projects 로 새로 만들기 ② `VERCEL_ORG_ID` 에 팀 ID(`team_…`) 대신 개인 ID ③ `VERCEL_PROJECT_ID`(`prj_…`)가 다른 프로젝트. "Vercel 연결 확인" 단계가 404·403 이면 ②·③, 통과하는데 이 오류면 ① |
| 빌드에서 `DATABASE_URL이 없습니다` | 운영: Vercel Production 환경 변수 확인 / 미리보기: Neon 단계 실패 여부 확인 |
| 미리보기 연기 테스트가 401·로그인 화면 | `VERCEL_AUTOMATION_BYPASS_SECRET` 이 없거나 틀림 |
| 로그인이 `Invalid origin` | 운영 `BETTER_AUTH_URL` 이 실제 접속 주소와 다름 / 미리보기에 `BETTER_AUTH_URL` 을 넣어 버림 |
| 운영 연기 테스트에서 commit 이 다름 | 도메인이 새 배포를 아직 가리키지 않음 — Vercel Deployments 에서 Production 배포 상태 확인 |
| 예약 작업이 안 돔 | Vercel Production 에 `CRON_SECRET` 이 있는지, Settings → Cron Jobs 에 보이는지 |
