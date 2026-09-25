// Vercel에 "운영(Production)" 배포를 할 때, 앱을 빌드하기 직전에 실행된다.
// drizzle/ 폴더의 마이그레이션(테이블 변경 기록) 중 아직 운영 DB에 적용되지 않은 것만 적용한다.
// 이미 적용된 기록은 건너뛰므로 여러 번 실행해도 안전하다.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// 내 컴퓨터에서 npm run build 를 할 때는 VERCEL_ENV 가 없으므로 건너뛴다.
if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] 운영 배포가 아니므로 DB 마이그레이션을 건너뜁니다.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL 환경 변수가 없습니다. Vercel 프로젝트 설정을 확인하세요.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("[migrate] 운영 DB 마이그레이션 완료");
