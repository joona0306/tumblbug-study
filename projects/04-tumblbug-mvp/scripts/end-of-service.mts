// 운영 종료 — 사용자 데이터 지우기 (20주차, /privacy 의 "스터디가 끝나면 모두 지워요" 약속)
//
//   1) 세기만 (기본, 아무것도 지우지 않는다):   DATABASE_URL="지울 DB 주소" npm run ops:end
//   2) 정말 지우기:                            DATABASE_URL="지울 DB 주소" npm run ops:end -- --confirm=DB이름
//      --confirm 에 그 DB 의 이름을 한 번 더 적어야 한다 (엉뚱한 DB 를 지우는 실수를 막는 장치)
//
// 관리자 계정만 남기고 후원·결제 기록·퍼널·찜·프로젝트·다른 계정을 모두 지운다 (lib/ops/purge.ts, 한 트랜잭션)
// ⚠️ 되돌릴 수 없다 → 지우기 전에 docs/operations.md 5번처럼 Neon 에서 지금 시점의 브랜치를 하나 만들어 두면 안전하다
//    (그 브랜치도 약속한 기간이 지나면 지운다)

import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local"); // 이미 있는 DATABASE_URL 은 덮어쓰지 않는다

const { drizzle } = await import("drizzle-orm/node-postgres");
const { Pool } = await import("pg");
const schema = await import("@/db/schema");
const { parseDatabaseUrl } = await import("@/lib/env");
const { countPurge, purgeServiceData } = await import("@/lib/ops/purge");

const url = parseDatabaseUrl(process.env);
const dbName = new URL(url).pathname.slice(1);
const host = new URL(url).hostname;
const confirm = process.argv.find((a) => a.startsWith("--confirm="))?.split("=")[1];

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle({ client: pool, schema });

const c = await countPurge(db);
console.log(`\n🧹 운영 종료 — DB: ${dbName} (${host.split(".")[0]}…)\n`);
console.log(`  남길 관리자 계정  ${c.keptAdmins}개`);
console.log(`  지울 계정        ${c.users}개 (로그인 기록 포함)`);
console.log(`  지울 프로젝트     ${c.projects}개 (리워드 포함)`);
console.log(`  지울 후원         ${c.fundings}건 · 결제 기록 ${c.paymentEvents}건`);
console.log(`  지울 퍼널 기록    ${c.funnelEvents}줄 · 찜 ${c.likes}개 · 요청 수 기록 ${c.rateLimits}줄`);
console.log(`  사진 (Vercel Blob) ${c.images.length}장 — DB 밖이라 따로 지운다 (아래)`);

if (c.keptAdmins === 0) {
  console.error("\n⚠️  관리자 계정이 없어요. 지우고 나면 로그인할 계정이 하나도 남지 않아요 — 관리자를 먼저 정하세요 (docs/accounts.md)");
  await pool.end();
  process.exit(1);
}

if (confirm !== dbName) {
  console.log(`\n세기만 했어요 (아무것도 지우지 않았어요). 정말 지우려면:\n  npm run ops:end -- --confirm=${dbName}\n`);
  await pool.end();
  process.exit(0);
}

await purgeServiceData(db);
const after = await countPurge(db);
console.log(`\n✅ 지웠어요 — 남은 계정 ${after.keptAdmins + after.users}개(관리자), 프로젝트 ${after.projects}, 후원 ${after.fundings}, 퍼널 ${after.funnelEvents}`);

// 사진: Vercel Blob 토큰이 있으면 여기서 함께 지운다. 없으면 Vercel → Storage → Blob 에서 직접 지운다
if (c.images.length > 0) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(c.images);
    console.log(`✅ 사진 ${c.images.length}장도 지웠어요`);
  } else {
    console.log(`📷 사진 ${c.images.length}장은 Vercel → Storage → Blob 에서 직접 지워 주세요 (BLOB_READ_WRITE_TOKEN 이 없어서 건너뜀)`);
  }
}
console.log("남은 일: 설문지 응답 정리 · Neon 에 만들어 둔 백업 브랜치는 약속한 기간 뒤 삭제 (docs/launch.md 7번)\n");
await pool.end();
