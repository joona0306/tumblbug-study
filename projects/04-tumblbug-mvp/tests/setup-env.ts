import { existsSync } from "node:fs";

// Vitest는 Next.js 밖에서 돌기 때문에 .env.local 을 직접 읽어 온다.
// (Next.js 규칙상 테스트 모드에서는 .env.local 을 자동으로 읽지 않는다)
// 이미 있는 환경 변수는 덮어쓰지 않으므로, CI에서는 워크플로에 적은 테스트용 값이 그대로 쓰인다.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
