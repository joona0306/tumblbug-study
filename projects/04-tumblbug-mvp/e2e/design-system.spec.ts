import { expect, test } from "@playwright/test";

// 5주차 흐름 테스트: 앱이 뜨고, 디자인 시스템 부품이 사람이 쓸 수 있는 상태로 보이는지.
// 화면을 찾을 때는 "보이는 글자·역할"로 찾는다 (getByRole) — 화면 낭독기가 찾는 방식과 같아서 접근성도 함께 확인된다.

test("첫 화면(홈)이 뜬다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "작은 공방의 첫 생산을 응원하세요" })).toBeVisible();
});

test("디자인 시스템: 버튼·배지·진행률이 보인다", async ({ page }) => {
  await page.goto("/design-system");
  await expect(page.getByRole("button", { name: "후원하기" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "마감됨" })).toBeDisabled();
  await expect(page.getByText("모금중", { exact: true })).toBeVisible();
  // 132%여도 막대는 100에서 멈추고, 읽어주는 글자는 132%
  const bars = page.getByRole("progressbar", { name: "달성률" });
  await expect(bars).toHaveCount(3);
  await expect(bars.nth(2)).toHaveAttribute("aria-valuenow", "100");
  await expect(bars.nth(2)).toHaveAttribute("aria-valuetext", "132%");
});

test("칩을 누르면 선택이 주소(URL)에 남는다", async ({ page }) => {
  await page.goto("/design-system");
  await page.getByRole("link", { name: "리빙" }).click();
  await expect(page).toHaveURL(/category=living/);
});

test("에러가 있는 입력칸은 이유를 함께 읽어 준다", async ({ page }) => {
  await page.goto("/design-system");
  const errorInput = page.getByRole("textbox", { name: "목표 금액" }).nth(1);
  await expect(errorInput).toHaveAttribute("aria-invalid", "true");
  await expect(errorInput).toHaveAccessibleDescription("10,000원 이상 입력해 주세요");
});
