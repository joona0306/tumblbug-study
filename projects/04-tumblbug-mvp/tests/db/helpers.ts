import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { expect } from "vitest";
import * as schema from "@/db/schema";

// DB 테스트 도우미.
// 각 테스트를 트랜잭션 안에서 실행하고 끝나면 무조건 되돌린다(ROLLBACK) → 개발 DB에 흔적이 남지 않는다.

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
export type TestDb = NodePgDatabase<typeof schema>;

export async function withRollback(run: (db: TestDb) => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await run(drizzle({ client, schema }));
  } finally {
    await client.query("rollback");
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}

// PostgreSQL이 거절했을 때의 에러 코드 — "왜" 거절됐는지 구분할 수 있다
export const PG = {
  CHECK: "23514", // CHECK 조건 위반
  UNIQUE: "23505", // 중복 (UNIQUE·기본 키)
  FOREIGN_KEY: "23503", // 외래 키 위반 (없는 줄을 가리킴)
  RESTRICT: "23001", // ON DELETE RESTRICT: 딸린 줄이 있어서 지울 수 없음
} as const;

type PgError = { code?: string; constraint?: string };

// 쿼리가 특정 규칙 때문에 거절되는지 확인한다. Drizzle은 원래 에러를 cause 에 담아 던진다.
export async function expectRejected(query: Promise<unknown>, code: string, constraint?: string) {
  const error = await query.then(
    () => undefined,
    (e: unknown) => ((e as { cause?: PgError }).cause ?? e) as PgError,
  );
  expect(error, "DB가 거절해야 하는데 통과했다").toBeDefined();
  expect(error?.code).toBe(code);
  if (constraint) expect(error?.constraint).toBe(constraint);
}

// 테스트용 사용자·프로젝트·리워드를 만든다 (트랜잭션 안이라 끝나면 사라진다)
let seq = 0;
export async function makeUser(db: TestDb) {
  seq += 1;
  const id = `test-user-${Date.now()}-${seq}`;
  await db.insert(schema.user).values({ id, name: "테스트", email: `${id}@example.com` });
  return id;
}

export async function makeProject(db: TestDb, creatorId: string) {
  const [row] = await db
    .insert(schema.project)
    .values({
      creatorId,
      title: "테스트 프로젝트",
      summary: "요약",
      category: "living",
      goalAmount: 1_000_000,
      deadline: "2099-12-31",
      imageUrl: "https://example.com/a.jpg",
    })
    .returning({ id: schema.project.id });
  return row.id;
}

export async function makeReward(db: TestDb, projectId: number, limitQty: number | null) {
  const [row] = await db
    .insert(schema.reward)
    .values({ projectId, title: "리워드", price: 30_000, limitQty, deliveryMonth: "2099-01-01" })
    .returning({ id: schema.reward.id });
  return row.id;
}
