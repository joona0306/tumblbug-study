import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { requireEnv } from "./lib/env";

// drizzle-kit은 Next.js 밖에서 실행되므로, .env.local 을 직접 읽어오게 한다.
// (두 번째 값 true = "개발 모드"로 읽기. 내 컴퓨터에서는 항상 개발용 DB를 쓰도록)
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  schema: "./db/schema.ts", // 테이블 설계도 파일 (TypeScript 로 바꾸면서 .ts 로)
  out: "./drizzle", // 마이그레이션(변경 기록) 파일이 저장될 폴더
  dialect: "postgresql",
  dbCredentials: {
    url: requireEnv("DATABASE_URL"),
  },
});
