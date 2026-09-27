import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { serverEnv } from "@/lib/env";
import { createPool } from "./pool";
import * as schema from "./schema";

// DB 연결 통로. 1~3단계의 Neon 전용 HTTP 드라이버 대신 표준 PostgreSQL 드라이버(pg)를 쓴다 — ADR-005
//  - 트랜잭션(둘 다 되거나 둘 다 안 되게)을 쓸 수 있다 (11주차 결제)
//  - Neon 뿐 아니라 CI·Docker 의 일반 PostgreSQL 에도 같은 코드로 붙는다 (16주차 EC2)
// Pool = 연결 여러 개를 만들어 두고 돌려 쓰는 "연결 보관함". 요청마다 새로 연결하지 않아 빠르다.
// 서버리스(Vercel)에서는 함수 하나가 연결을 많이 잡지 않게 작게(5개) 둔다. Neon 풀러가 뒤에서 나눠 쓴다.
// 끊긴 연결 처리(pool.on("error"))는 db/pool.ts 에 — 15주차에 Sentry 가 잡은 장애를 고친 곳
const pool = createPool(serverEnv().DATABASE_URL, 5);

export const db = drizzle({ client: pool, schema });
// 함수가 db 를 인자로 받을 때 쓰는 타입 (테스트에서는 트랜잭션용 db 를 넘길 수 있다)
export type Db = NodePgDatabase<typeof schema>;
