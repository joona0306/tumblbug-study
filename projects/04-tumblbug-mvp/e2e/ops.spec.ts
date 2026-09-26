import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 13주차 흐름 테스트: 창작자 대시보드 · 관리자 · 예약 작업 · 로딩·빈 화면·에러 상태
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const MUG = "산과 들을 담은 수제 머그 2차"; // 창작자: 흙과불
const projectIdOf = async (title: string) => (await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [title])).rows[0].id;

test.afterAll(() => pool.end());

test.describe("창작자 대시보드", () => {
  test("내 프로젝트의 모금 현황·날짜별 모금·리워드별 판매·후원자·배송지가 보인다", async ({ page }) => {
    const id = await projectIdOf(MUG);
    await login(page, "heuk_bul@seed.moa.test", `/studio?project=${id}`);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "모금 현황" })).toBeVisible();
    await expect(main.getByRole("table", { name: "날짜별 모금액" }).getByRole("row")).toHaveCount(14); // 화면 낭독기용 표: 14일
    await expect(main.getByRole("heading", { name: "리워드별 판매" })).toBeVisible();
    await expect(main.getByRole("cell", { name: "머그 2개 세트", exact: false }).first()).toBeVisible();
    await expect(main.getByRole("heading", { name: /후원자·배송지/ })).toBeVisible();
  });

  test("남의 프로젝트 번호를 넣어도 남의 대시보드는 보이지 않는다 (내 첫 프로젝트로)", async ({ page }) => {
    const othersId = await projectIdOf("골목 고양이 사진집 2쇄");
    await login(page, "heuk_bul@seed.moa.test", `/studio?project=${othersId}`);
    await expect(page.getByRole("main").getByRole("link", { name: MUG })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("main")).not.toContainText("골목 고양이 사진집 2쇄");
  });

  test("프로젝트가 없으면 빈 화면 + 만들기 버튼", async ({ page }) => {
    await login(page, "supporter_kim@seed.moa.test", "/studio");
    await expect(page.getByText("아직 만든 프로젝트가 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "첫 프로젝트 만들기" })).toHaveAttribute("href", "/projects/new");
  });
});

test.describe("관리자", () => {
  test("관리자가 아니면 '없는 페이지' (관리자 화면이 있다는 것도 알리지 않는다)", async ({ page }) => {
    await login(page, "supporter_kim@seed.moa.test", "/");
    await expect(page.getByRole("link", { name: "관리자", exact: true })).toHaveCount(0);
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
  });

  test("숨기면 목록·상세에서 사라지고, 다시 보이게 하면 돌아온다", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "같은 프로젝트의 공개 여부를 두 기기에서 동시에 바꾸면 서로 방해한다 — 데스크톱에서만");
    const title = "기차로 건넌 대륙, 여행 에세이";
    const id = await projectIdOf(title);
    const visitor = await (await browser.newContext()).newPage(); // 로그인하지 않은 방문자

    await login(page, "moa_admin@seed.moa.test", "/admin");
    try {
      await page.getByRole("button", { name: `${title} 숨기기` }).click();
      await expect(page.getByRole("button", { name: `${title} 다시 보이기` })).toBeVisible();
      expect((await visitor.goto(`/projects/${id}`))?.status()).toBe(404);
      await visitor.goto("/projects");
      await expect(visitor.getByRole("link", { name: title })).toHaveCount(0);

      await page.getByRole("button", { name: `${title} 다시 보이기` }).click();
      await expect(page.getByRole("button", { name: `${title} 숨기기` })).toBeVisible();
      expect((await visitor.goto(`/projects/${id}`))?.status()).toBe(200);
    } finally {
      await pool.query("update project set hidden = false where id = $1", [id]); // 테스트가 중간에 멈춰도 원래대로
    }
  });
});

test("예약 작업 주소: 비밀값이 없거나 틀리면 401, 맞으면 실행 결과", async ({ request }) => {
  test.skip(!process.env.CRON_SECRET, "CRON_SECRET 이 없어서 건너뜀");
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect((await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong-secret-0000000" } })).status()).toBe(401);

  const ok = await request.get("/api/cron/daily", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ finalized: expect.any(Array), pendings: expect.any(Object), rateLimitRows: expect.any(Number) });
});

test.describe("로딩·빈 화면·에러", () => {
  test("없는 주소는 한국어 404 화면", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
    await expect(page.getByRole("link", { name: "프로젝트 둘러보기" })).toBeVisible();
  });

  test("조건에 맞는 프로젝트가 없으면 빈 화면 + 필터 초기화", async ({ page }) => {
    await page.goto("/projects?category=game");
    await expect(page.getByText("조건에 맞는 프로젝트가 없어요")).toBeVisible();
    await page.getByRole("link", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL("/projects");
  });

  test("화면을 그리다 에러가 나면 에러 화면 + 다시 시도 (내부 내용은 보여 주지 않는다)", async ({ page }) => {
    await page.goto("/debug/sentry?throw=render");
    await expect(page.getByRole("heading", { name: "화면을 불러오지 못했어요" })).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });
});
