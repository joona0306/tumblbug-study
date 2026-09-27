import { Pool } from "pg";

// DB 연결 보관함(Pool) 만들기 — 앱(db/index.ts)과 테스트가 같은 설정을 쓰도록 한 곳에 둔다
//
// ⚠️ pool.on("error") 는 반드시 붙인다 (15주차 — Sentry 가 잡은 실제 장애)
//   보관함 속에서 "쉬고 있는" 연결을 DB 쪽이 끊으면(Neon 이 오래 쉰 연결을 정리할 때 등) Pool 이 error 이벤트를 낸다.
//   받는 코드가 없으면 Node 는 이것을 처리 안 된 에러로 보고 **프로세스를 통째로 끝낸다** → 그 순간의 요청이 모두 실패
//   받아 두기만 하면 Pool 은 끊긴 연결을 버리고, 다음 요청에 새 연결을 만든다 (pg 공식 문서가 권하는 방법)
export function createPool(connectionString: string, max = 5): Pool {
  const pool = new Pool({ connectionString, max });
  pool.on("error", (error) => {
    console.error(`[db] 쉬고 있던 DB 연결이 끊겼어요 — 다음 요청은 새 연결로 처리해요: ${error.message}`);
  });
  return pool;
}
