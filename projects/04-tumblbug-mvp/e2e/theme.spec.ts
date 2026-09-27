import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers";

// 14주차: 마이페이지 + 화면 테마 고르기 (시스템 설정 따라가기 / 라이트 / 다크)
// 쿠키는 브라우저마다 따로라서, 테스트끼리(모바일·데스크톱) 서로 방해하지 않는다
const LIGHT_BG = "rgb(247, 247, 248)"; // --color-bg 라이트 (#f7f7f8)
const DARK_BG = "rgb(18, 18, 20)"; // --color-bg 다크 (#121214)

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("마이페이지: 로그인이 필요하고, 내 후원·내 찜·스튜디오로 가는 길이 있다", async ({ page }) => {
  await page.goto("/me");
  await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent("/me")}`);

  await login(page, "supporter_kim@seed.moa.test", "/");
  await page.getByRole("link", { name: /마이페이지/ }).click(); // 헤더의 내 이름
  await expect(page).toHaveURL("/me");
  const nav = page.getByRole("navigation", { name: "내 활동" });
  await expect(nav.getByRole("link", { name: "내 후원 내역" })).toHaveAttribute("href", "/me/fundings");
  await expect(nav.getByRole("link", { name: "내 찜" })).toHaveAttribute("href", "/me/likes");
});

test("기본은 기기 설정을 따라가고, 고르면 그 테마로 고정된다 (새로고침해도 유지)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" }); // 기기가 다크 모드라고 흉내 낸다
  await login(page, "supporter_kim@seed.moa.test", "/me");
  const group = page.getByRole("group", { name: "화면 테마" });

  // ① 기본: 시스템 설정 따라가기 → 기기가 다크라서 다크
  await expect(group.getByRole("radio", { name: "시스템 설정 따라가기" })).toBeChecked();
  expect(await bodyBg(page)).toBe(DARK_BG);

  // ② 라이트를 고르면: 기기가 다크여도 라이트
  await group.getByText("라이트", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
  await expect(page.getByRole("status", { name: "알림" })).toContainText("화면 테마: 라이트");

  // ③ 새로고침해도, 다른 화면으로 가도 유지 (쿠키 → 서버가 첫 화면부터 붙인다)
  await page.reload();
  await expect(group.getByRole("radio", { name: "라이트" })).toBeChecked();
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await bodyBg(page)).toBe(LIGHT_BG);

  // ④ 다크 → 기기가 라이트여도 다크
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/me");
  await group.getByText("다크", { exact: true }).click();
  await expect.poll(() => bodyBg(page)).toBe(DARK_BG);

  // ⑤ 다시 시스템 설정으로 → data-theme 이 사라지고 기기(라이트)를 따른다
  await group.getByText("시스템", { exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
});
