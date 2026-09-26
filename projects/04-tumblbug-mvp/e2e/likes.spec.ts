import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 12주차 흐름 테스트: 찜(낙관적 업데이트·되돌리기·캐시 공유) + 토스트 + 창작자 스튜디오 자동 새로고침
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const LIKER = "supporter_park@seed.moa.test";
const CAT = "골목 고양이 사진집 2쇄"; // 예시 데이터에서 LIKER 가 찜하지 않은 프로젝트
const MUG = "산과 들을 담은 수제 머그 2차"; // 창작자: 흙과불

const idOf = async (email: string) => (await pool.query<{ id: string }>('select id from "user" where email = $1', [email])).rows[0].id;
const projectIdOf = async (title: string) => (await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [title])).rows[0].id;

test.afterAll(async () => {
  // 테스트가 남긴 찜을 지워 예시 데이터를 원래대로
  await pool.query("delete from project_like where user_id = $1 and project_id = $2", [await idOf(LIKER), await projectIdOf(CAT)]);
  await pool.end();
});

test("로그인하지 않고 하트를 누르면 로그인 화면으로 (돌아올 주소 포함)", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: `${CAT} 찜하기` }).click();
  await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent("/projects")}`);
});

test("API: 로그인 없이 401, 잘못된 값은 400, 남의 프로젝트 후원 목록은 403", async ({ request, page }) => {
  expect((await request.get("/api/likes")).status()).toBe(401);
  expect((await request.get(`/api/projects/${await projectIdOf(MUG)}/fundings`)).status()).toBe(401);

  await login(page, LIKER, "/");
  const bad = await page.request.post("/api/likes", { data: { projectId: "abc" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error.fields.projectId).toBeTruthy();
  expect((await page.request.get(`/api/projects/${await projectIdOf(MUG)}/fundings`)).status()).toBe(403);
});

test.describe("같은 계정·DB를 쓰는 흐름 (데스크톱에서만)", () => {
  test.skip(({ isMobile }) => isMobile, "모바일·데스크톱이 동시에 같은 계정의 찜을 바꾸면 서로 방해한다");

  test("찜하면 카드·헤더·상세·내 찜이 함께 바뀌고, 내 찜에서 취소하면 바로 사라진다", async ({ page }) => {
    await login(page, LIKER, "/projects");
    const headerCount = page.getByTestId("header-like-count");
    const before = Number(await headerCount.textContent());

    const heart = page.getByRole("button", { name: `${CAT} 찜하기` });
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    // 화면은 누르자마자 바뀌지만(낙관적 업데이트) 서버 저장은 조금 뒤에 끝난다 → 다른 화면으로 가기 전에 저장까지 기다린다
    const saved = page.waitForResponse((r) => r.url().endsWith("/api/likes") && r.request().method() === "POST");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    expect((await saved).status()).toBe(201);
    await expect(headerCount).toHaveText(String(before + 1));

    // 상세: 같은 캐시 → 이미 찜 상태 (새로고침 없이 이동해도)
    await page.getByRole("link", { name: CAT }).first().click();
    await expect(page.getByRole("main").getByRole("button", { name: `${CAT} 찜하기` }).first()).toHaveAttribute("aria-pressed", "true");

    // 내 찜: 목록에 있고, 취소하면 즉시 사라진다
    await page.getByRole("link", { name: `내 찜 ${before + 1}개` }).click();
    await expect(page.getByRole("heading", { name: "내 찜" })).toBeVisible();
    const card = page.getByRole("main").getByRole("article").filter({ hasText: CAT });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: `${CAT} 찜하기` }).click();
    await expect(card).toHaveCount(0);
    await expect(headerCount).toHaveText(String(before));
  });

  test("서버가 실패하면 하트가 되돌아가고 토스트로 알린다", async ({ page }) => {
    await login(page, LIKER, "/projects");
    const headerCount = page.getByTestId("header-like-count");
    const before = await headerCount.textContent();

    // 찜 요청만 일부러 늦게 실패시킨다 (목록 가져오기 GET 은 그대로) → "먼저 바뀌었다가 되돌아가는" 모습을 확인
    await page.route(/\/api\/likes/, async (route) => {
      if (route.request().method() === "GET") return route.continue();
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    const heart = page.getByRole("button", { name: `${CAT} 찜하기` });
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true"); // 낙관적 업데이트: 서버 대답 전
    await expect(page.getByRole("status", { name: "알림" })).toContainText("찜하지 못했어요");
    await expect(heart).toHaveAttribute("aria-pressed", "false"); // 되돌림
    await expect(headerCount).toHaveText(before ?? "");
  });

  test("창작자 스튜디오: 새 후원이 들어오면 15초 안에 목록에 나타나고 토스트가 뜬다", async ({ page }) => {
    test.setTimeout(60_000);
    const projectId = await projectIdOf(MUG);
    await login(page, "heuk_bul@seed.moa.test", `/studio?project=${projectId}`);
    await expect(page.getByRole("heading", { name: "최근 후원" })).toBeVisible();

    const orderId = `e2e-studio-${Date.now()}`;
    try {
      await pool.query(
        "insert into funding (project_id, supporter_id, amount, order_id, status, payment_key, paid_at, message) values ($1, $2, 7000, $3, 'paid', $3, now(), 'e2e 응원')",
        [projectId, await idOf("supporter_lee@seed.moa.test"), orderId],
      );
      await expect(page.getByRole("status", { name: "알림" })).toContainText("새 후원 1건이 들어왔어요", { timeout: 25_000 });
      await expect(page.getByRole("main").getByRole("listitem").first()).toContainText("e2e 응원");
    } finally {
      await pool.query("delete from funding where order_id = $1", [orderId]);
    }
  });
});
