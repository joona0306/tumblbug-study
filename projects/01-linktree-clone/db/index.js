import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// .env.local 에 넣어둔 Neon 접속 주소로 DB 연결 통로를 만든다.
const sql = neon(process.env.DATABASE_URL);

// 앞으로 모든 DB 작업은 이 db 객체를 통해 한다.
export const db = drizzle({ client: sql });
