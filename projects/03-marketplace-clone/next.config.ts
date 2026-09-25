import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 서버 액션으로 보낼 수 있는 요청 크기 (기본 1MB).
      // 사진은 브라우저에서 줄여서 보내지만, 여유를 두고 2MB 까지 허용한다.
      bodySizeLimit: "2mb",
    },
  },
  images: {
    // <Image> 부품으로 보여줄 수 있는 외부 사진 주소. Vercel Blob 공개 저장소만 허용한다.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
