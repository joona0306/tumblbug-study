import { and, asc, desc, eq, type SQL, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project, projectLike, reward, user } from "@/db/schema";
import type { Category } from "@/lib/categories";
import { type Cursor, encodeCursor } from "@/lib/cursor";
import type { ProjectStatus } from "@/lib/project-status";

// 목록·상세에서 쓰는 조회 (8주차).
// 모금 상태는 lib/project-status.ts 의 getProjectStatus 와 "같은 규칙"을 SQL로 계산한다
// → tests/db/listing.test.ts 가 두 결과가 같은지 확인한다 (규칙이 두 곳에 있으니 어긋나지 않게 감시)

// 결제 완료 후원만 모은 프로젝트별 합계 (서브쿼리)
const stats = (db: Db) =>
  db
    .select({
      projectId: funding.projectId,
      raised: sql<number>`sum(${funding.amount})::int`.as("raised"),
      supporters: sql<number>`count(distinct ${funding.supporterId})::int`.as("supporters"),
    })
    .from(funding)
    .where(eq(funding.status, "paid"))
    .groupBy(funding.projectId)
    .as("stats");

// 마감 = 마감일 다음 날 00:00 한국 시간.  (deadline + 1)::timestamp at time zone 'Asia/Seoul' = 그 순간(timestamptz)
function statusSql(s: ReturnType<typeof stats>): SQL<ProjectStatus> {
  return sql<ProjectStatus>`case
    when now() < (${project.deadline} + 1)::timestamp at time zone 'Asia/Seoul' then 'funding'
    when coalesce(${s.raised}, 0) >= ${project.goalAmount} then 'success'
    else 'failed' end`;
}

export type ProjectCardData = {
  id: number;
  title: string;
  summary: string;
  category: Category;
  imageUrl: string;
  deadline: string;
  goalAmount: number;
  raised: number;
  supporters: number;
  creatorName: string;
  status: ProjectStatus;
  createdAt: string; // 최신순 커서용 (ISO 시각)
};

export type ListOptions = {
  category?: Category;
  status?: ProjectStatus;
  sort?: "deadline" | "popular" | "new";
  limit?: number;
  cursor?: Cursor; // 이 항목 "다음"부터 (9주차 무한 스크롤)
};

export async function listProjects(db: Db, { category, status, sort = "deadline", limit = 12, cursor }: ListOptions = {}): Promise<ProjectCardData[]> {
  const s = stats(db);
  const computedStatus = statusSql(s);
  const supporters = sql<number>`coalesce(${s.supporters}, 0)`;
  const deadlineDesc = sort === "deadline" && status !== undefined && status !== "funding";

  const order =
    sort === "popular"
      ? [desc(supporters), asc(project.id)]
      : sort === "new"
        ? [desc(project.createdAt), desc(project.id)]
        : // 마감 임박순: 모금중이면 가까운 마감부터, 끝난 것은 최근에 끝난 것부터
          deadlineDesc
          ? [desc(project.deadline), desc(project.id)]
          : [asc(project.deadline), asc(project.id)];

  // 커서 조건: 정렬 순서에서 "커서 항목보다 뒤"인 것만. (a, b) > (x, y) = 행 비교 — a가 크거나, 같으면 b가 큰 것
  const after = !cursor
    ? undefined
    : sort === "popular"
      ? sql`(${supporters} < ${Number(cursor.v)} or (${supporters} = ${Number(cursor.v)} and ${project.id} > ${cursor.id}))`
      : sort === "new"
        ? sql`(${project.createdAt}, ${project.id}) < (${String(cursor.v)}::timestamptz, ${cursor.id})`
        : deadlineDesc
          ? sql`(${project.deadline}, ${project.id}) < (${String(cursor.v)}::date, ${cursor.id})`
          : sql`(${project.deadline}, ${project.id}) > (${String(cursor.v)}::date, ${cursor.id})`;

  const rows = await db
    .select({
      id: project.id,
      title: project.title,
      summary: project.summary,
      category: project.category,
      imageUrl: project.imageUrl,
      deadline: project.deadline,
      goalAmount: project.goalAmount,
      raised: sql<number>`coalesce(${s.raised}, 0)`,
      supporters,
      creatorName: user.name,
      status: computedStatus,
      createdAt: project.createdAt,
    })
    .from(project)
    .innerJoin(user, eq(user.id, project.creatorId))
    .leftJoin(s, eq(s.projectId, project.id))
    .where(
      and(
        eq(project.hidden, false), // 관리자가 숨긴 프로젝트는 목록에 보이지 않는다 (PRD A-1)
        category ? eq(project.category, category) : undefined,
        status ? sql`${computedStatus} = ${status}` : undefined,
        after,
      ),
    )
    .orderBy(...order)
    .limit(limit);
  return rows.map(({ createdAt, ...row }) => ({ ...row, createdAt: createdAt.toISOString() })) as ProjectCardData[];
}

// 한 페이지 + 다음 페이지 커서. limit+1개를 가져와서 하나가 더 있으면 "다음이 있다"
export async function listProjectsPage(db: Db, options: ListOptions & { limit: number }) {
  const rows = await listProjects(db, { ...options, limit: options.limit + 1 });
  const items = rows.slice(0, options.limit);
  const last = items.at(-1);
  const hasMore = rows.length > options.limit && last !== undefined;
  const sort = options.sort ?? "deadline";
  const nextCursor = hasMore
    ? encodeCursor({ v: sort === "popular" ? last.supporters : sort === "new" ? last.createdAt : last.deadline, id: last.id })
    : null;
  return { items, nextCursor };
}

// 상세: 프로젝트 + 창작자 + 합계 + 리워드(남은 수량). 숨긴 프로젝트·없는 번호는 undefined
export async function getProjectDetail(db: Db, projectId: number) {
  const s = stats(db);
  const [row] = await db
    .select({
      id: project.id,
      creatorId: project.creatorId,
      title: project.title,
      summary: project.summary,
      description: project.description,
      category: project.category,
      imageUrl: project.imageUrl,
      deadline: project.deadline,
      goalAmount: project.goalAmount,
      hidden: project.hidden,
      raised: sql<number>`coalesce(${s.raised}, 0)`,
      supporters: sql<number>`coalesce(${s.supporters}, 0)`,
      creatorName: user.name,
      // 찜 개수 (12주차) — 상관 서브쿼리: 이 프로젝트 줄마다 project_like 를 센다 (project_like_project_idx 인덱스 사용)
      likeCount: sql<number>`(select count(*)::int from ${projectLike} where ${projectLike.projectId} = ${project.id})`,
    })
    .from(project)
    .innerJoin(user, eq(user.id, project.creatorId))
    .leftJoin(s, eq(s.projectId, project.id))
    .where(eq(project.id, projectId));
  if (!row || row.hidden) return undefined;

  const rewards = await db
    .select({
      id: reward.id,
      title: reward.title,
      description: reward.description,
      price: reward.price,
      limitQty: reward.limitQty,
      soldQty: reward.soldQty,
      deliveryMonth: reward.deliveryMonth,
      needsShipping: reward.needsShipping,
    })
    .from(reward)
    .where(eq(reward.projectId, projectId))
    .orderBy(asc(reward.sortOrder), asc(reward.id));

  return { ...row, category: row.category as Category, rewards };
}

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>;
