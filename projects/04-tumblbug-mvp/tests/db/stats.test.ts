import { afterAll, describe, expect, it } from "vitest";
import { funding } from "@/db/schema";
import { getProjectStats } from "@/lib/queries/stats";
import { closePool, makeProject, makeUser, withRollback } from "./helpers";

afterAll(closePool);

describe("getProjectStats", () => {
  it("결제 완료(paid)만 더하고, 같은 후원자는 한 명으로 센다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const [kim, lee] = [await makeUser(db), await makeUser(db)];
      await db.insert(funding).values([
        { projectId, supporterId: kim, amount: 30_000, orderId: "s-1", status: "paid", paymentKey: "k-1", paidAt: new Date() },
        { projectId, supporterId: kim, amount: 10_000, orderId: "s-2", status: "paid", paymentKey: "k-2", paidAt: new Date() }, // 같은 사람 두 번
        { projectId, supporterId: lee, amount: 50_000, orderId: "s-3", status: "paid", paymentKey: "k-3", paidAt: new Date() },
        { projectId, supporterId: lee, amount: 99_000, orderId: "s-4", status: "pending" }, // 결제 전 — 세지 않음
        { projectId, supporterId: lee, amount: 99_000, orderId: "s-5", status: "failed" }, // 실패 — 세지 않음
      ]);

      const [stats] = await getProjectStats(db, [projectId]);
      expect(stats).toEqual({ projectId, goalAmount: 1_000_000, raised: 90_000, supporters: 2 });
    }));

  it("후원이 한 건도 없는 프로젝트도 0으로 나온다 (LEFT JOIN)", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const [stats] = await getProjectStats(db, [projectId]);
      expect(stats).toMatchObject({ raised: 0, supporters: 0 });
    }));

  it("빈 목록이면 DB에 묻지 않고 빈 결과", async () => {
    // db 를 쓰지 않으므로 아무 값이나 넘겨도 된다
    expect(await getProjectStats(undefined as never, [])).toEqual([]);
  });
});
