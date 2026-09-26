"use client";

import { useEffect } from "react";
import { useFundingStore } from "@/lib/funding/store";

// 결제가 끝나면 후원서(Zustand persist)를 비운다 → 다음 후원은 처음부터, 배송지도 브라우저에 남지 않는다
export function ClearDraft() {
  useEffect(() => {
    useFundingStore.getState().reset();
  }, []);
  return null;
}
