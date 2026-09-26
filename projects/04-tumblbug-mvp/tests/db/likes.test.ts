import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { project, projectLike } from "@/db/schema";
import { addLike, getMyLikeIds, removeLike } from "@/lib/queries/likes";
import { listLikedProjects } from "@/lib/queries/listing";
import { closePool, makeProject, makeUser, withRollback } from "./helpers";

afterAll(closePool);

describe("찜 (addLike·removeLike·getMyLikeIds)", () => {
  it("찜하기 → 두 번째는 'exists', 취소는 여러 번 해도 같은 결과", () =>
    withRollback(async (db) => {
      const me = await makeUser(db);
      const projectId = await makeProject(db, await makeUser(db));

      expect(await addLike(db, me, projectId)).toBe("created");
      expect(await addLike(db, me, projectId)).toBe("exists");
      expect(await getMyLikeIds(db, me)).toEqual([projectId]);

      await removeLike(db, me, projectId);
      await removeLike(db, me, projectId);
      expect(await getMyLikeIds(db, me)).toEqual([]);
    }));

  it("없는 프로젝트·숨긴 프로젝트는 찜할 수 없고, 찜한 뒤 숨겨지면 목록에서 빠진다", () =>
    withRollback(async (db) => {
      const me = await makeUser(db);
      const projectId = await makeProject(db, await makeUser(db));
      expect(await addLike(db, me, 999_999_999)).toBe("not_found");

      await addLike(db, me, projectId);
      await db.update(project).set({ hidden: true }).where(eq(project.id, projectId));
      expect(await getMyLikeIds(db, me)).toEqual([]);
      expect(await addLike(db, me, projectId)).toBe("not_found");
    }));

  it("내 찜만, 최근 찜한 순서로", () =>
    withRollback(async (db) => {
      const me = await makeUser(db);
      const other = await makeUser(db);
      const creator = await makeUser(db);
      const [a, b, c] = [await makeProject(db, creator), await makeProject(db, creator), await makeProject(db, creator)];
      await addLike(db, me, a);
      await addLike(db, me, b);
      // 트랜잭션 안에서는 now() 가 "트랜잭션 시작 시각"으로 고정이라 둘의 created_at 이 같다 → 시각을 직접 정해 준다
      await db.update(projectLike).set({ createdAt: new Date("2026-09-01T00:00:00Z") }).where(and(eq(projectLike.userId, me), eq(projectLike.projectId, a)));
      await addLike(db, other, c);
      expect(await getMyLikeIds(db, me)).toEqual([b, a]);
    }));

  it("내 찜 카드 목록(listLikedProjects): 찜한 순서, 숨긴 프로젝트는 빠진다", () =>
    withRollback(async (db) => {
      const me = await makeUser(db);
      const creator = await makeUser(db);
      const [a, b, hiddenOne] = [await makeProject(db, creator), await makeProject(db, creator), await makeProject(db, creator)];
      for (const id of [a, b, hiddenOne]) await addLike(db, me, id);
      await db.update(projectLike).set({ createdAt: new Date("2026-09-01T00:00:00Z") }).where(and(eq(projectLike.userId, me), eq(projectLike.projectId, a)));
      await db.update(project).set({ hidden: true }).where(eq(project.id, hiddenOne));

      const cards = await listLikedProjects(db, me);
      expect(cards.map((c) => c.id)).toEqual([b, a]);
      expect(cards[0]).toMatchObject({ status: "funding", raised: 0, supporters: 0 });
    }));
});
