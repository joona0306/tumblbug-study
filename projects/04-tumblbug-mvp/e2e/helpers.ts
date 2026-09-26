import { expect, type Page } from "@playwright/test";

// 흐름 테스트 공용 도우미
export const SEED_PASSWORD = "moa-dev-1234"; // scripts/seed.mts 의 예시 계정 비밀번호

// 로그인 화면에서 로그인하고, "정확히 그 주소"로 돌아올 때까지 기다린다.
// (정규식으로 "/"를 기다리면 아무 주소에나 맞아 버린다. 여러 테스트가 동시에 로그인하면 느려질 수 있어 15초까지 기다린다)
export async function login(page: Page, email: string, redirect = "/", password = SEED_PASSWORD) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL((url) => url.pathname + url.search === redirect, { timeout: 15_000 });
}
