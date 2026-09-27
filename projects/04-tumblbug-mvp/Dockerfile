# syntax=docker/dockerfile:1
# 모아 앱을 Docker 이미지로 만드는 순서표 (16주차)
#
# 이미지 = 앱 + 앱이 돌아가는 데 필요한 모든 것(Node.js, 패키지, 빌드 결과)을 한 덩어리로 묶은 것
# → 내 컴퓨터든 EC2 서버든 "같은 이미지"를 실행하면 똑같이 동작한다
#
# 단계를 나눈다 (multi-stage build): 설치·빌드에 쓴 도구는 버리고, 실행에 필요한 파일만 마지막 이미지에 담는다
#   deps     패키지 설치
#   migrator DB 마이그레이션·예시 데이터 넣기 (개발 도구 drizzle-kit·tsx 가 필요해서 따로)
#   builder  next build
#   runner   실행 — 최종 이미지 (가장 작다)

# 내 컴퓨터·CI 와 같은 Node 버전. alpine = 아주 작은 리눅스 (이미지 크기가 작아 올리고 내려받기 빠르다)
ARG NODE_VERSION=22.14.0

# ---------- ① deps: 패키지 설치 ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
# 패키지 목록만 먼저 복사한다 → 코드만 바뀌고 패키지는 그대로면 이 단계를 캐시로 건너뛴다 (다시 빌드가 빨라진다)
COPY package.json package-lock.json ./
RUN npm ci

# ---------- ② migrator: DB 마이그레이션 (compose·배포에서 앱보다 먼저 한 번 실행) ----------
FROM deps AS migrator
COPY . .
CMD ["npm", "run", "db:migrate"]

# ---------- ③ builder: 빌드 ----------
FROM deps AS builder
COPY . .
# NEXT_PUBLIC_ 으로 시작하는 값은 빌드할 때 브라우저용 코드에 "새겨진다" → 실행할 때가 아니라 지금 넣어야 한다
# 비워 두면 Sentry·결제 버튼이 꺼진 채로 빌드된다 (CI 와 같다)
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_TOSS_CLIENT_KEY=
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_TOSS_CLIENT_KEY=$NEXT_PUBLIC_TOSS_CLIENT_KEY \
    NEXT_TELEMETRY_DISABLED=1
# DB 주소·로그인 비밀키 같은 비밀값은 넣지 않는다 — 이미지에 남으면 이미지를 받은 누구나 볼 수 있다
# (빌드 중에는 환경 변수 검사를 건너뛴다: lib/env.ts serverEnv, 14주차)
# mkdir -p public: 우리 public 폴더는 비어 있어서 git 에 올라가지 않는다 → GitHub 에서 받은 코드에는 폴더가 없어 ④의 복사가 실패한다
RUN mkdir -p public && npm run build

# ---------- ④ runner: 실행 (최종 이미지) ----------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# HOSTNAME=0.0.0.0: 컨테이너 "밖"에서 오는 요청도 받는다 (기본값이면 컨테이너 안에서만 열려서 접속이 안 된다)

# next build 의 standalone 결과 = 실행에 필요한 파일만 골라 담은 폴더 (next.config.ts 의 output: "standalone")
# public·.next/static(사진·CSS·JS)은 standalone 에 들어가지 않아서 따로 복사한다 (Next.js 문서의 안내)
# --chown=node:node: 파일 주인을 관리자(root)가 아닌 일반 사용자 node 로 → 아래 USER node 가 읽을 수 있게
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# 관리자(root)가 아닌 일반 사용자로 실행한다 — 앱에 구멍이 있어도 서버 전체를 건드리기 어렵게
USER node
EXPOSE 3000

# Docker 가 30초마다 /api/health 를 불러 "살아 있나"를 본다 (14주차의 상태 확인 주소, DB 까지 확인)
# 3번 연속 실패하면 unhealthy 로 표시된다 → docker ps 에서 보이고, 16주차 배포 스크립트가 이 값으로 성공·실패를 가린다
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
