import { afterAll, describe, expect, it } from "vitest";
import { funding } from "@/db/schema";
import { countFailureReasons, listPaymentFailures } from "@/lib/queries/admin";
import { closePool, makeProject, makeUser, withRollback } from "./helpers";
import { uniq } from "./unique";

afterAll(closePool);

describe("관리자 조회", () => {
  it("결제 실패 목록·이유별 개수: 실패만, 최근 30일만, 많은 이유부터", () =>
    withRollback(async (db) => {
      const supporter = await makeUser(db);
      const projectId = await makeProject(db, await makeUser(db));
      const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const base = { projectId, supporterId: supporter, amount: 10_000, status: "failed" as const };
      const tag = uniq("adm");
      await db.insert(funding).values([
        { ...base, orderId: `${tag}-1`, failReason: "ZZ_TEST_CANCEL" },
        { ...base, orderId: `${tag}-2`, failReason: "ZZ_TEST_CANCEL" },
        { ...base, orderId: `${tag}-3`, failReason: "ZZ_TEST_SOLD_OUT", paymentKey: `${tag}-k3` },
        { ...base, orderId: `${tag}-4`, failReason: "ZZ_TEST_CANCEL", createdAt: old }, // 30일 밖
        { ...base, orderId: `${tag}-5`, status: "paid", paymentKey: `${tag}-k5`, paidAt: new Date() }, // 실패 아님
      ]);

      const mine = (await listPaymentFailures(db, { limit: 1000 })).filter((f) => f.orderId.startsWith(tag));
      expect(mine.map((f) => [f.orderId, f.reachedApproval]).sort()).toEqual([
        [`${tag}-1`, false],
        [`${tag}-2`, false],
        [`${tag}-3`, true],
      ]);
      const reasons = (await countFailureReasons(db)).filter((r) => r.reason.startsWith("ZZ_TEST_"));
      expect(reasons).toEqual([
        { reason: "ZZ_TEST_CANCEL", count: 2 },
        { reason: "ZZ_TEST_SOLD_OUT", count: 1 },
      ]);
    }));
});
