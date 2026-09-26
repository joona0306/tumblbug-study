import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { funding, project } from "@/db/schema";
import { checkProjectOwner, listRecentFundings } from "@/lib/queries/studio";
import { closePool, makeProject, makeReward, makeUser, withRollback } from "./helpers";

afterAll(closePool);

describe("창작자 스튜디오 조회", () => {
  it("최근 후원: 결제 완료만, 결제 시각이 늦은 것부터 (먼저 만들었어도 늦게 결제되면 위로)", () =>
    withRollback(async (db) => {
      const creator = await makeUser(db);
      const supporter = await makeUser(db);
      const projectId = await makeProject(db, creator);
      const rewardId = await makeReward(db, projectId, null);
      const at = (m: number) => new Date(Date.UTC(2026, 8, 26, 10, m));
      const base = { projectId, supporterId: supporter, amount: 30_000 };
      await db.insert(funding).values([
        { ...base, rewardId, orderId: "s-early-made-late-paid", status: "paid", paymentKey: "k1", createdAt: at(0), paidAt: at(9), message: "힘내세요" },
        { ...base, rewardId: null, amount: 5_000, orderId: "s-later", status: "paid", paymentKey: "k2", createdAt: at(1), paidAt: at(2) },
        { ...base, rewardId, orderId: "s-pending", createdAt: at(3) },
        { ...base, rewardId, orderId: "s-failed", status: "failed", createdAt: at(4) },
      ]);

      const rows = await listRecentFundings(db, projectId);
      expect(rows.map((r) => r.amount)).toEqual([30_000, 5_000]);
      expect(rows[0]).toMatchObject({ rewardTitle: "리워드", message: "힘내세요", paidAt: at(9).toISOString() });
      expect(rows[1].rewardTitle).toBeNull();
    }));

  it("주인 확인: 내 것 ok · 남의 것 forbidden · 없거나 숨김 not_found", () =>
    withRollback(async (db) => {
      const creator = await makeUser(db);
      const projectId = await makeProject(db, creator);
      expect(await checkProjectOwner(db, projectId, creator)).toBe("ok");
      expect(await checkProjectOwner(db, projectId, await makeUser(db))).toBe("forbidden");
      expect(await checkProjectOwner(db, 999_999_999, creator)).toBe("not_found");
      await db.update(project).set({ hidden: true }).where(eq(project.id, projectId));
      expect(await checkProjectOwner(db, projectId, creator)).toBe("not_found");
    }));
});
