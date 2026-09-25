import { sql } from "drizzle-orm";
import { db } from "@/db";

// 브라우저에서 /api/health 로 접속하면 서버가 DB에 "지금 몇 시야?"라고 물어보고 답을 보여준다.
// DB 연결이 잘 되었는지 확인하는 용도 (운영할 때도 계속 쓴다).
export async function GET() {
  try {
    const result = await db.execute(sql`select now() as now`);
    return Response.json({ ok: true, dbTime: result.rows[0].now });
  } catch (error) {
    console.error("DB 연결 실패:", error);
    return Response.json({ ok: false, error: "DB에 연결할 수 없습니다" }, { status: 500 });
  }
}
