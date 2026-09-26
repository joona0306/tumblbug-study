import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 서버 액션으로 보낼 수 있는 요청 크기 (기본 1MB). 사진은 브라우저에서 줄여 보내지만 여유를 두고 2MB
      bodySizeLimit: "2mb",
    },
  },
  images: {
    // <Image> 로 보여줄 수 있는 외부 사진 주소: 우리 Vercel Blob 공개 저장소 + 시드 데이터의 Unsplash
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

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
