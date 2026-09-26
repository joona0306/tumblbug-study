import { afterAll, describe, expect, it } from "vitest";
import { funding } from "@/db/schema";
import { listMyFundings } from "@/lib/queries/fundings";
import { closePool, makeProject, makeReward, makeUser, withRollback } from "./helpers";

afterAll(closePool);

describe("내 후원 내역 listMyFundings", () => {
  it("결제 완료·확인 중·승인 실패만 최신순으로, 결제창에서 취소한 것과 남의 후원은 빼고", () =>
    withRollback(async (db) => {
      const me = await makeUser(db);
      const other = await makeUser(db);
      const projectId = await makeProject(db, await makeUser(db));
      const rewardId = await makeReward(db, projectId, null);
      const at = (minutes: number) => new Date(Date.UTC(2026, 8, 26, 10, minutes));
      const base = { projectId, supporterId: me, amount: 30_000 };

      await db.insert(funding).values([
        { ...base, rewardId, orderId: "mine-paid", status: "paid", paymentKey: "pk-1", paidAt: at(1), createdAt: at(1) },
        { ...base, rewardId: null, amount: 5_000, orderId: "mine-processing", paymentKey: "pk-2", createdAt: at(2) }, // 승인 응답을 못 받음
        { ...base, rewardId, orderId: "mine-rejected", status: "failed", failReason: "REJECT_CARD_COMPANY", paymentKey: "pk-3", createdAt: at(3) },
        { ...base, rewardId, orderId: "mine-canceled", status: "failed", failReason: "USER_CANCEL", createdAt: at(4) }, // 결제창에서 취소
        { ...base, rewardId, orderId: "mine-abandoned", createdAt: at(5) }, // 결제창을 열고 떠남
        { ...base, supporterId: other, rewardId, orderId: "others-paid", status: "paid", paymentKey: "pk-4", paidAt: at(6), createdAt: at(6) },
      ]);

      const rows = await listMyFundings(db, me);
      expect(rows.map((r) => [r.orderId, r.status])).toEqual([
        ["mine-rejected", "failed"],
        ["mine-processing", "processing"],
        ["mine-paid", "paid"],
      ]);
      expect(rows.find((r) => r.orderId === "mine-processing")?.rewardTitle).toBeNull(); // 리워드 없이 후원
      expect(rows.find((r) => r.orderId === "mine-paid")?.rewardTitle).toBe("리워드");
    }));
});
