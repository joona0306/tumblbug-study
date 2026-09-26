import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

// GET /api/health — 서버가 살아 있고 DB에 닿는지 (2단계 health 를 이어서, 14주차)
//  - CD: 배포 직후 이 주소가 200 인지 먼저 본다 (연기 테스트) / 16주차 EC2: 실패하면 이전 버전으로 되돌린다
//  - 15주차 가동 감시가 몇 분마다 이 주소를 부른다
//  - commit: 지금 돌아가는 코드가 어느 커밋인지 (Vercel 이 알려 주는 값, 내 컴퓨터에서는 "local")
export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.APP_VERSION ?? "local";
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "ok", commit }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] DB 연결 실패", error);
    return NextResponse.json({ ok: false, db: "error", commit }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
