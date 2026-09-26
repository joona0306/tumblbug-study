"use client";

import { Button } from "@/components/ui/Button";

// 브라우저에서 처리하지 않은 에러 → Sentry 브라우저 SDK가 잡아서 보낸다
export function ThrowButton() {
  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => {
          throw new Error("Sentry 테스트 에러 (브라우저)");
        }}
      >
        브라우저에서 테스트 에러 내기
      </Button>
    </div>
  );
}
