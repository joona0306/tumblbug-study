import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

// Sentry 연결. 소스맵(압축된 코드를 원래 코드 줄로 되돌리는 지도)을 올려야 에러 위치가 원래 코드로 보인다.
// 올리려면 SENTRY_AUTH_TOKEN 이 필요하다 — 없으면 올리기만 건너뛰고 빌드는 정상으로 된다.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // 빌드 로그를 조용히 (CI에서만 자세히)
  silent: !process.env.CI,
  telemetry: false,
});
