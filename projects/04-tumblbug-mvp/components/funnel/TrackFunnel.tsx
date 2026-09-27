"use client";

import { useEffect } from "react";

// 이 화면에 도착했다고 서버에 알린다 (퍼널 기록, 15주차). 화면에는 아무것도 그리지 않는다
// keepalive: 곧바로 다른 화면으로 넘어가도 요청이 끊기지 않게. 실패해도 사용자에게는 영향 없음 (기록만 빠진다)
export function TrackFunnel({ projectId, step }: { projectId: number; step: "view" | "reward" | "shipping" }) {
  useEffect(() => {
    fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, step }),
      keepalive: true,
    }).catch(() => {});
  }, [projectId, step]);
  return null;
}
