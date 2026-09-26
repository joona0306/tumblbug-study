import { defineConfig } from "vitest/config";

// 단위 테스트 설정
export default defineConfig({
  resolve: {
    // "@/lib/…" 같은 경로 별칭을 tsconfig.json 설정 그대로 쓴다
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // 흐름 테스트(Playwright, e2e 폴더)는 따로 돌리므로 여기서는 제외한다
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e"],
  },
});
