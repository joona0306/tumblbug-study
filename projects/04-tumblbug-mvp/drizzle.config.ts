import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { parseEnv } from "./lib/env";

// drizzle-kit(마이그레이션 도구)은 Next.js 밖에서 실행되므로 .env.local 을 직접 읽어온다.
// (두 번째 값 true = 개발 모드로 읽기 → 내 컴퓨터에서는 항상 개발용 DB)
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  schema: "./db/schema.ts", // 표 설계도 (물리 ERD를 코드로)
  out: "./drizzle", // 마이그레이션(DB 변경 기록) 파일이 저장되는 폴더
  dialect: "postgresql",
  dbCredentials: {
    url: parseEnv(process.env).DATABASE_URL,
  },
});
