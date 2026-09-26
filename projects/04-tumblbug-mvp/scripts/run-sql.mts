// SQL 파일 실행기:  npm run db:sql -- sql/week6-explain.sql
// Neon SQL Editor 에 붙여 넣는 것과 같다. 안전장치: DB 이름이 _dev 또는 _test 로 끝날 때만 실행한다.
import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const file = process.argv[2];
if (!file) {
  console.error("사용법: npm run db:sql -- <SQL 파일 경로>");
  process.exit(1);
}
const url = process.env.DATABASE_URL ?? "";
const dbName = new URL(url).pathname.slice(1);
if (!/_(dev|test)$/.test(dbName)) {
  console.error(`[sql] DB 이름이 "${dbName}" 입니다. _dev 또는 _test 로 끝나는 DB에서만 실행합니다.`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
// 주석을 뺀 뒤 ; 로 나눠 한 문장씩 실행하고, 결과(또는 실행 계획)를 보여준다
const statements = readFileSync(file, "utf8")
  .replace(/--.*$/gm, "")
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const [i, statement] of statements.entries()) {
  const started = Date.now();
  const result = await client.query(statement);
  console.log(`\n--- ${i + 1}. ${statement.split("\n")[0].slice(0, 70)} (${Date.now() - started}ms, ${result.rowCount ?? 0}줄)`);
  if (result.fields?.[0]?.name === "QUERY PLAN") {
    for (const row of result.rows) console.log(row["QUERY PLAN"]);
  } else if (result.rows.length > 0) {
    console.table(result.rows.slice(0, 10));
  }
}
await client.end();
