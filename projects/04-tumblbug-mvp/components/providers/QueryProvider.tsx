"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// TanStack Query: 브라우저가 서버 데이터를 가져와 "기억(캐시)"하는 도구 (상태 관리 지도: 서버 상태를 브라우저에서 다룰 때)
// QueryClient = 그 기억 저장소. 컴포넌트가 다시 그려져도 같은 저장소를 쓰도록 useState 로 한 번만 만든다.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30초 안에는 "아직 신선하다"고 보고 다시 가져오지 않는다 (API 캐시 시간과 맞춤)
            retry: 1, // 실패하면 한 번만 더 시도
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
