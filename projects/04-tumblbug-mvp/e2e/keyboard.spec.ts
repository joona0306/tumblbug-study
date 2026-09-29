import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 20주차 완료 기준: "키보드 조작 가능" — 마우스 없이 Tab·Space·Enter 만으로 상세 → 후원 ① → ② → ③ 까지 간다
// (로그인만 도우미로 하고, 그다음부터는 키보드만 쓴다)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => pool.end());
test.skip(({ isMobile }) => isMobile, "휴대폰에는 Tab 키가 없다 — 데스크톱에서만");

// Tab 을 눌러 가며 원하는 요소에 초점이 올 때까지 (못 찾으면 실패 = 키보드로 닿을 수 없다)
async function tabTo(page: Page, matches: (el: { tag: string; name: string; type: string | null }) => boolean, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const el = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      const labelled = a instanceof HTMLInputElement ? (a.labels?.[0]?.textContent ?? "") : "";
      return { tag: a?.tagName ?? "", name: (a?.getAttribute("aria-label") ?? a?.textContent ?? labelled).trim() + " " + labelled.trim(), type: a?.getAttribute("type") ?? null };
    });
    if (matches(el)) return;
  }
  throw new Error("Tab 으로 닿지 못했다");
}

test("키보드만으로 상세 → 리워드 → 배송지 → 확인", async ({ page }) => {
  test.slow();
  const { rows } = await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", ["산과 들을 담은 수제 머그 2차"]);
  const id = rows[0].id;
  await login(page, "supporter_kim@seed.moa.test", `/projects/${id}`);

  // 상세: "후원하기" 까지 Tab → Enter
  await tabTo(page, (el) => el.tag === "A" && el.name.includes("후원하기"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/projects/${id}/fund`);

  // ① 리워드: 라디오에 닿으면 화살표로 고르고 → "다음"
  await tabTo(page, (el) => el.type === "radio");
  const target = page.getByRole("radio", { name: /머그 2개 세트/ });
  for (let i = 0; i < 5 && !(await target.isChecked()); i++) await page.keyboard.press("ArrowDown");
  await expect(target).toBeChecked();
  await tabTo(page, (el) => el.tag === "BUTTON" && el.name.startsWith("다음"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/projects/${id}/fund?step=2`);

  // ② 배송지: 칸마다 Tab → 입력 → "다음: 확인" Enter
  await tabTo(page, (el) => el.name.includes("받는 분"));
  await page.keyboard.type("김모아");
  await page.keyboard.press("Tab");
  await page.keyboard.type("010-1234-5678");
  await page.keyboard.press("Tab");
  await page.keyboard.type("서울시 중구 세종대로 1");
  await tabTo(page, (el) => el.tag === "BUTTON" && el.name.includes("다음: 확인"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/projects/${id}/fund?step=3`);
  await expect(page.getByRole("group", { name: "배송지", exact: true })).toContainText("010-1234-5678");
});

test("키보드로 이동하면 초점 테두리가 보인다", async ({ page }) => {
  await page.goto("/projects");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe("none"); // globals.css 의 :focus-visible
});
