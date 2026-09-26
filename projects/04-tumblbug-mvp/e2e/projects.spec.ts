import { del } from "@vercel/blob";
import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers";
import { Pool } from "pg";

// 7주차 흐름 테스트: 프로젝트 만들기·수정, 권한(내 것만), 후원이 있으면 잠금
// 테스트가 DB에서 프로젝트 번호를 찾고, 만든 프로젝트·사진을 끝에 지운다
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const CREATOR = { email: "ohneul_workshop@seed.moa.test" };
const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function projectIdByTitle(title: string): Promise<number | undefined> {
  const { rows } = await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [title]);
  return rows[0]?.id;
}

const loginAsCreator = (page: Page, redirect: string) => login(page, CREATOR.email, redirect);

test.afterAll(() => pool.end());

test("빈 칸으로 제출하면 칸마다 이유를 보여준다", async ({ page }) => {
  await loginAsCreator(page, "/projects/new");
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await expect(page.getByRole("textbox", { name: "제목" })).toHaveAccessibleDescription("제목을 입력해 주세요");
  await expect(page.getByRole("combobox", { name: "카테고리" })).toHaveAccessibleDescription("카테고리를 골라 주세요");
  await expect(page.getByText("대표 사진을 1장 골라 주세요")).toBeVisible();
});

test("남의 프로젝트 수정 화면은 '없는 페이지'", async ({ page }) => {
  const othersId = await projectIdByTitle("산과 들을 담은 수제 머그 2차"); // 흙과불의 프로젝트
  await loginAsCreator(page, "/");
  const response = await page.goto(`/projects/${othersId}/edit`);
  expect(response?.status()).toBe(404);
});

test("결제 완료 후원이 있는 프로젝트는 목표 금액·마감일이 잠긴다", async ({ page }) => {
  const id = await projectIdByTitle("손으로 두드려 만든 구리 펜던트 조명");
  await loginAsCreator(page, `/projects/${id}/edit`);
  await expect(page.getByRole("textbox", { name: "목표 금액 (원)" })).toBeDisabled();
  await expect(page.getByText("후원이 있어 목표 금액은 바꿀 수 없어요")).toBeVisible();
});

test("사진과 함께 프로젝트를 만들고, 수정해서 저장한다", async ({ page }) => {
  // 사진을 실제 Vercel Blob에 올리므로 토큰이 있을 때만 (CI에는 없다 — 14주차에 미리보기 환경에서 확인)
  test.skip(!hasBlob, "BLOB_READ_WRITE_TOKEN 이 없어서 건너뜀");
  const title = `흐름 테스트 프로젝트 ${Date.now()}`;

  try {
    await loginAsCreator(page, "/projects/new");
    await page.getByLabel("대표 사진").setInputFiles("e2e/fixtures/cover.jpg");
    await page.getByRole("textbox", { name: "제목" }).fill(title);
    await page.getByRole("textbox", { name: "한 줄 요약" }).fill("흐름 테스트가 만든 프로젝트");
    await page.getByRole("combobox", { name: "카테고리" }).selectOption("craft");
    await page.getByRole("textbox", { name: "목표 금액 (원)" }).fill("1,500,000");
    await page.getByLabel("마감일").fill(await page.getByLabel("마감일").getAttribute("max").then((max) => max ?? ""));
    await page.getByRole("button", { name: "프로젝트 만들기" }).click();

    await expect(page).toHaveURL(/\/projects\/\d+\/edit\?created=1/, { timeout: 20_000 }); // 사진 업로드까지 기다린다
    await expect(page.getByRole("main").getByRole("status")).toContainText("프로젝트를 만들었어요");
    await expect(page.getByRole("img", { name: "고른 대표 사진 미리보기" })).toHaveAttribute("src", /public\.blob\.vercel-storage\.com/);

    await page.getByRole("textbox", { name: "제목" }).fill(`${title} (수정)`);
    await page.getByRole("button", { name: "저장하기" }).click();
    await expect(page.getByRole("main").getByRole("status")).toHaveText("저장했어요.");
    await expect(page.getByRole("textbox", { name: "제목" })).toHaveValue(`${title} (수정)`);
  } finally {
    // 뒷정리: 테스트가 중간에 실패해도 만든 프로젝트와 저장소의 사진을 지운다
    const { rows } = await pool.query<{ image_url: string }>("delete from project where title like $1 returning image_url", [`${title}%`]);
    for (const row of rows) await del(row.image_url);
  }
});
