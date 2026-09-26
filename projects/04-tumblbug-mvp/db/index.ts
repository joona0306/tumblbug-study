import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

// DB 연결 통로. 1~3단계의 Neon 전용 HTTP 드라이버 대신 표준 PostgreSQL 드라이버(pg)를 쓴다 — ADR-005
//  - 트랜잭션(둘 다 되거나 둘 다 안 되게)을 쓸 수 있다 (11주차 결제)
//  - Neon 뿐 아니라 CI·Docker 의 일반 PostgreSQL 에도 같은 코드로 붙는다 (16주차 EC2)
// Pool = 연결 여러 개를 만들어 두고 돌려 쓰는 "연결 보관함". 요청마다 새로 연결하지 않아 빠르다.
const pool = new Pool({
  connectionString: serverEnv().DATABASE_URL,
  // 서버리스(Vercel)에서는 함수 하나가 연결을 많이 잡지 않게 작게 둔다. Neon 풀러가 뒤에서 나눠 쓴다.
  max: 5,
});

export const db = drizzle({ client: pool, schema });
export type Db = typeof db;
