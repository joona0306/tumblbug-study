import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@/db/pool";

// 15주차 장애 재현: 쉬고 있는 DB 연결을 DB 쪽이 끊어도 앱이 죽지 않고, 다음 쿼리는 새 연결로 된다
// (Sentry: "Error: Connection terminated unexpectedly" — Fatal. pool 의 error 를 받는 코드가 없어 프로세스가 끝났다)
// 받는 코드가 없으면 Vitest 가 "Unhandled Error" 로 이 테스트를 실패시킨다 → 이 테스트가 곧 재발 방지 장치
// Neon 의 "-pooler" 주소는 중간 관리자(PgBouncer)가 실제 DB 연결을 여러 손님에게 돌려 쓴다
// → "이 연결을 끊어" 가 엉뚱한 연결(끊으라고 시킨 쪽)을 끊을 수 있어서, 이 테스트만 DB 에 직접 연결한다 (CI 의 주소에는 없어서 그대로)
const directUrl = process.env.DATABASE_URL!.replace("-pooler.", ".");
const admin = createPool(directUrl, 1);
afterAll(() => admin.end());

describe("DB 연결 보관함 (createPool)", () => {
  it("쉬고 있는 연결을 DB 가 끊어도 프로세스가 죽지 않고, 다음 쿼리는 성공한다", async () => {
    const pool = createPool(directUrl, 1);
    const { rows: [{ pid }] } = await pool.query<{ pid: number }>("select pg_backend_pid() as pid"); // 연결 1개가 보관함에서 쉬게 된다
    await admin.query("select pg_terminate_backend($1)", [pid]); // DB 쪽에서 그 연결을 끊는다 (Neon 이 쉬는 연결을 정리하는 상황)
    await new Promise((r) => setTimeout(r, 1_000)); // 끊겼다는 알림(error 이벤트)이 도착할 시간

    const { rows } = await pool.query<{ ok: number }>("select 1 as ok"); // 끊긴 연결은 버리고 새로 연결
    expect(rows[0].ok).toBe(1);
    await pool.end();
  });
});
