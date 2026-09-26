import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { funding, project } from "@/db/schema";
import { addDays, kstToday } from "@/lib/dates";
import { getProjectDetail, listProjects } from "@/lib/queries/listing";
import { getProjectStatus } from "@/lib/project-status";
import { closePool, makeProject, makeUser, type TestDb, withRollback } from "./helpers";

afterAll(closePool);

// 결제 완료 후원을 하나 넣는다
async function pay(db: TestDb, projectId: number, amount: number, n: number) {
  await db.insert(funding).values({ projectId, supporterId: await makeUser(db), amount, orderId: `list-${projectId}-${n}`, status: "paid", paymentKey: `k-${projectId}-${n}`, paidAt: new Date() });
}

describe("SQL로 계산한 상태 = getProjectStatus (규칙이 두 곳에 있으니 어긋나지 않게 감시)", () => {
  it("어제 마감·오늘 마감·내일 마감 × 목표 달성·미달·딱 도달", () =>
    withRollback(async (db) => {
      const creator = await makeUser(db);
      const today = kstToday();
      const cases = [
        { deadline: addDays(today, -1), raised: 1_000_000 }, // 어제 끝남, 딱 도달 → 성공
        { deadline: addDays(today, -1), raised: 999_000 }, // 어제 끝남, 미달 → 실패
        { deadline: today, raised: 1_000_000 }, // 오늘 마감 → 목표를 채웠어도 아직 모금중
        { deadline: addDays(today, 1), raised: 0 }, // 내일 마감 → 모금중
      ];
      const ids: number[] = [];
      for (const [i, c] of cases.entries()) {
        const id = await makeProject(db, creator);
        await db.update(project).set({ deadline: c.deadline, title: `상태 비교 ${i}` }).where(eq(project.id, id));
        if (c.raised) await pay(db, id, c.raised, i);
        ids.push(id);
      }

      const rows = await listProjects(db, { limit: 1000 });
      for (const [i, id] of ids.entries()) {
        const row = rows.find((r) => r.id === id)!;
        const expected = getProjectStatus({ goalAmount: 1_000_000, raised: cases[i].raised, deadline: cases[i].deadline, now: new Date() });
        expect(row.status, `경우 ${i}`).toBe(expected);
      }
      expect(rows.find((r) => r.id === ids[0])!.status).toBe("success");
      expect(rows.find((r) => r.id === ids[1])!.status).toBe("failed");
      expect(rows.find((r) => r.id === ids[2])!.status).toBe("funding");
    }));
});

describe("listProjects", () => {
  it("상태·카테고리로 거르고, 숨긴 프로젝트는 빼고, 합계를 붙인다", () =>
    withRollback(async (db) => {
      const creator = await makeUser(db);
      const shown = await makeProject(db, creator);
      const hidden = await makeProject(db, creator);
      await db.update(project).set({ hidden: true }).where(eq(project.id, hidden));
      await db.update(project).set({ category: "music" }).where(eq(project.id, shown));
      await pay(db, shown, 30_000, 1);
      await pay(db, shown, 20_000, 2);

      const rows = await listProjects(db, { category: "music", status: "funding", limit: 1000 });
      const row = rows.find((r) => r.id === shown);
      expect(row).toMatchObject({ raised: 50_000, supporters: 2, status: "funding", category: "music", creatorName: "테스트" });
      expect(rows.some((r) => r.id === hidden)).toBe(false);
      expect(rows.every((r) => r.category === "music")).toBe(true);
    }));

  it("숨긴 프로젝트는 상세도 없다", () =>
    withRollback(async (db) => {
      const id = await makeProject(db, await makeUser(db));
      await db.update(project).set({ hidden: true }).where(eq(project.id, id));
      expect(await getProjectDetail(db, id)).toBeUndefined();
    }));
});
