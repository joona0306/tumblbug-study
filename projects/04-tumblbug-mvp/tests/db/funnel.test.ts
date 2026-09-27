import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { project } from "@/db/schema";
import { getFunnel, recordFunnelStep } from "@/lib/funnel";
import { closePool, makeProject, makeUser, withRollback } from "./helpers";
import { uniq } from "./unique";

afterAll(closePool);

describe("퍼널 기록·집계", () => {
  it("같은 방문자·프로젝트·단계는 한 번만 (새로고침해도), 숨긴·없는 프로젝트는 기록하지 않는다", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const visitor = uniq("visitor");
      expect(await recordFunnelStep(db, visitor, projectId, "view")).toBe(true);
      expect(await recordFunnelStep(db, visitor, projectId, "view")).toBe(false);
      expect(await recordFunnelStep(db, visitor, 999_999_999, "view")).toBe(false);

      await db.update(project).set({ hidden: true }).where(eq(project.id, projectId));
      expect(await recordFunnelStep(db, visitor, projectId, "reward")).toBe(false);
    }));

  it("단계별 수와 전환율: 앞 단계 대비·상세 대비 (핵심 지표 = 상세 → 결제 완료)", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      // 방문자 10명이 상세를 보고 → 5명 리워드 → 4명 배송지 → 4명 결제 요청 → 3명 결제 완료
      const plan: [number, "view" | "reward" | "shipping" | "payment_request" | "paid"][] = [[10, "view"], [5, "reward"], [4, "shipping"], [4, "payment_request"], [3, "paid"]];
      const visitors = Array.from({ length: 10 }, () => uniq("v"));
      for (const [n, step] of plan) for (const v of visitors.slice(0, n)) await recordFunnelStep(db, v, projectId, step);

      const funnel = await getFunnel(db, { projectId });
      expect(funnel.map((r) => [r.step, r.count, r.fromPrevious, r.fromView])).toEqual([
        ["view", 10, null, null],
        ["reward", 5, 50, 50],
        ["shipping", 4, 80, 40],
        ["payment_request", 4, 100, 40],
        ["paid", 3, 75, 30],
      ]);
    }));

  it("기록이 없으면 0, 전환율은 계산하지 않는다 (0으로 나누지 않게)", () =>
    withRollback(async (db) => {
      const projectId = await makeProject(db, await makeUser(db));
      const funnel = await getFunnel(db, { projectId });
      expect(funnel.every((r) => r.count === 0 && r.fromView === null)).toBe(true);
      expect(funnel[1].fromPrevious).toBeNull();
    }));
});
