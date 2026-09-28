import { expect, test } from "@playwright/test";

// 17주차: 실제 사용자를 받기 전 — 학습용 안내가 모든 화면에 있고, 개인정보 처리 안내를 찾아갈 수 있다
test("모든 화면 위에 학습용·테스트 결제 안내가 있다", async ({ page }) => {
  for (const path of ["/", "/projects", "/login"]) {
    await page.goto(path);
    await expect(page.getByRole("note")).toContainText("결제는 모두 테스트");
  }
});

test("화면 아래 개인정보 처리 안내 → 무엇을·누가·언제까지", async ({ page }) => {
  await page.goto("/projects");
  const footer = page.getByRole("contentinfo"); // <footer>
  await expect(footer).toContainText("실제로 돈이 나가지 않아요");
  await footer.getByRole("link", { name: "개인정보 처리 안내" }).click();

  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "개인정보 처리 안내" })).toBeVisible();
  for (const name of ["무엇을 저장하나요", "누가 볼 수 있나요", "언제까지 보관하나요"]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  await expect(page.getByText("배송지는 실제 주소가 아니어도 돼요.")).toBeVisible();
});
