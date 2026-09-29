// 운영 점검 한 번에 보기 (15주차):  npm run ops:check
//  - 프로젝트 하나의 퍼널만:  npm run ops:check -- --project=12   (18주차 — 내 프로젝트만 보고 싶을 때)
//  - 기본은 .env.local 의 DB (개발 DB)
//  - 운영 DB 를 볼 때:  DATABASE_URL="운영 주소" npm run ops:check   (이미 있는 환경 변수는 .env.local 이 덮어쓰지 않는다)
// 퍼널·결제 실패 이유를 보여 주고, 점검 4가지 중 하나라도 문제가 있으면 종료 코드 1 (나중에 CI·예약 작업에서 쓸 수 있게)
// 읽기만 한다 — DB 를 바꾸지 않는다

import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { drizzle } = await import("drizzle-orm/node-postgres");
const { Pool } = await import("pg");
const schema = await import("@/db/schema");
const { parseDatabaseUrl } = await import("@/lib/env");
const { getFunnel, getShippingPass } = await import("@/lib/funnel");
const { countFailureReasons } = await import("@/lib/queries/admin");
const { findPaymentMismatches, findStalePendings, findStockMismatches, findUnfinalizedProjects } = await import("@/lib/ops/checks");

// DB 주소만 있으면 된다 (로그인 비밀키 등은 필요 없다)
const url = parseDatabaseUrl(process.env);
const pool = new Pool({ connectionString: url, max: 2 });
const db = drizzle({ client: pool, schema });
const dbName = new URL(url).pathname.slice(1);
const DAYS = 30;
// --project=12 → 퍼널을 그 프로젝트만으로 (나머지 점검은 DB 전체 그대로)
const projectArg = process.argv.find((a) => a.startsWith("--project="));
const projectId = projectArg ? Number(projectArg.split("=")[1]) : undefined;
if (projectId !== undefined && !(Number.isInteger(projectId) && projectId > 0)) {
  console.error("--project= 뒤에는 프로젝트 번호(양의 정수)를 넣어 주세요");
  process.exit(1);
}

console.log(`\n📊 운영 점검 — DB: ${dbName} · 최근 ${DAYS}일\n`);

console.log(`■ 퍼널 (방문자·프로젝트 기준${projectId ? ` · 프로젝트 ${projectId}만` : ""})`);
const funnel = await getFunnel(db, { days: DAYS, projectId });
for (const row of funnel) {
  const rates = row.fromPrevious === null ? "" : `   (앞 단계의 ${row.fromPrevious ?? "-"}% · 상세의 ${row.fromView ?? "-"}%)`;
  console.log(`  ${String(row.count).padStart(5)}  ${row.label}${rates}`);
}
// 배송지 통과율 (19주차): 배송 없는 리워드는 배송지를 건너뛰므로 "결제 요청"의 앞 단계 %는 믿을 수 없다 → 사람을 따라가 따로 계산
const pass = await getShippingPass(db, { days: DAYS, projectId });
if (pass.arrived > 0) {
  console.log(`  ↳ 배송지 통과율 ${pass.rate}%  (배송지에 온 ${pass.arrived}명 중 ${pass.passed}명이 결제 요청까지)`);
  console.log("    ※ '결제 요청'의 앞 단계 %에는 배송지를 건너뛴 사람(배송 없는 리워드)도 섞여 있어요 — 배송지 화면은 위 통과율로 보세요");
}
// 단계마다 따로 세므로, 공유 링크로 후원 화면에 바로 온 사람이 있으면 앞 단계보다 많을 수 있다 (100% 초과)
if (funnel.some((r) => (r.fromPrevious ?? 0) > 100)) console.log("  ※ 100%가 넘는 단계: 앞 단계를 거치지 않고 바로 들어온 방문자가 있어요 (공유 링크 등)");

console.log("\n■ 결제 실패 이유");
const reasons = await countFailureReasons(db, { days: DAYS });
if (reasons.length === 0) console.log("  (없음)");
for (const r of reasons) console.log(`  ${r.reason.padEnd(24)} ${r.count}건`);

console.log("\n■ 점검");
const checks = [
  ["재고 어긋남 (판매 수 ≠ 결제 완료·승인 중 수량)", await findStockMismatches(db)],
  ["결제 상태 어긋남 (토스 DONE 인데 결제 완료 아님)", await findPaymentMismatches(db)],
  ["예약 작업 미실행 의심 (마감 하루 지나도 모금중)", await findUnfinalizedProjects(db)],
  ["오래된 결제 대기 (하루 넘게 남음)", await findStalePendings(db)],
] as const;
let problems = 0;
for (const [title, rows] of checks) {
  if (rows.length === 0) {
    console.log(`  ✅ ${title}`);
  } else {
    problems += 1;
    console.log(`  ⚠️  ${title}: ${rows.length}건`);
    console.table(rows.slice(0, 10));
  }
}

await pool.end();
console.log(problems === 0 ? "\n모두 정상이에요.\n" : `\n문제 ${problems}가지 — docs/operations.md 의 "점검에서 문제가 나오면" 을 보세요.\n`);
process.exit(problems === 0 ? 0 : 1);
