import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit은 Next.js 밖에서 실행되므로, .env.local 을 직접 읽어오게 한다.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./db/schema.js", // 테이블 설계도 파일
  out: "./drizzle", // 마이그레이션(변경 기록) 파일이 저장될 폴더
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
