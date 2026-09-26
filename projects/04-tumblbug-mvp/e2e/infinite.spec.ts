import { type APIResponse, expect, test } from "@playwright/test";
import { Pool } from "pg";

// 9주차 흐름 테스트: /api/projects (커서 페이지네이션·응답 규칙) + 목록 무한 스크롤(TanStack Query)
// 시드 데이터는 한 페이지(12개)를 넘지 않으므로, "게임" 카테고리에 임시 프로젝트 30개를 넣고 끝나면 지운다.
// API·무한 스크롤은 기기와 무관하므로 desktop 에서만 실행한다.
// (mobile·desktop 이 동시에 돌면 둘 다 30개씩 넣어서 "게임" 카테고리가 60개가 되어 개수 확인이 어긋난다)
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "기기와 무관한 테스트 — desktop 에서만");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const TAG = `[무한스크롤 테스트 ${Date.now()}-${Math.random().toString(36).slice(2, 6)}]`;
const COUNT = 30;

test.beforeAll(async () => {
  await pool.query(
    `insert into project (creator_id, title, summary, category, goal_amount, deadline, image_url)
     select (select id from "user" where email = 'ohneul_workshop@seed.moa.test'), $1 || ' ' || g, '요약', 'game', 100000,
            (now() at time zone 'Asia/Seoul')::date + (g % 20) + 1,
            'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=1200&q=80&fm=jpg'
     from generate_series(1, $2::int) g`,
    [TAG, COUNT],
  );
});
test.afterAll(async () => {
  await pool.query("delete from project where title like $1", [`${TAG}%`]);
  await pool.end();
});

test("API: 커서로 끝까지 넘기면 빠짐·중복 없이 전부 나온다", async ({ request }) => {
  const seen: number[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const res: APIResponse = await request.get(`/api/projects?category=game&limit=7${cursor ? `&cursor=${cursor}` : ""}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["x-ratelimit-limit"]).toBe("60");
    const body: { items: { id: number; title: string }[]; nextCursor: string | null } = await res.json();
    seen.push(...body.items.filter((p) => p.title.startsWith(TAG)).map((p) => p.id));
    cursor = body.nextCursor;
    pages += 1;
  } while (cursor && pages < 20);
  expect(seen).toHaveLength(COUNT);
  expect(new Set(seen).size).toBe(COUNT); // 중복 없음
  expect(pages).toBe(Math.ceil(COUNT / 7)); // 30개 ÷ 7 = 5페이지
});

test("API: 잘못된 값은 400과 칸마다의 이유", async ({ request }) => {
  const res = await request.get("/api/projects?status=done&limit=100");
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("INVALID_QUERY");
  expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["status", "limit"]));
});

test("목록: 스크롤하면 다음 페이지가 이어서 붙고, 끝에 안내가 나온다", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/projects?category=game");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(12); // 첫 페이지 (서버가 그림)

  // 스크롤이 끝에 닿을 때마다 다음 페이지가 붙는다 → 끝까지 반복하면 30개 모두.
  // (한 번에 여러 페이지를 이어 받을 수도 있고, 다른 테스트와 함께 돌면 느려질 수 있어 "결국 30개"로 확인한다)
  await expect(page.getByRole("button", { name: "더 보기" })).toBeVisible(); // 스크롤 대신 쓸 수 있는 버튼도 있다
  await expect
    .poll(
      async () => {
        await page.mouse.wheel(0, 5000);
        return cards.count();
      },
      { timeout: 45_000 },
    )
    .toBe(COUNT);
  await expect(page.getByText("모든 프로젝트를 봤어요")).toBeVisible();
});
