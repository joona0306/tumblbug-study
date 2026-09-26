import { expect, test } from "@playwright/test";

// 7주차 흐름 테스트: 회원가입·로그인·로그아웃, 로그인이 필요한 주소 막기, 돌아올 주소
// 예시 계정은 npm run db:seed 로 만든다 (CI에서도 시드를 넣는다)
const SEED = { email: "supporter_kim@seed.moa.test", password: "moa-dev-1234", name: "김모아" };

// 로그인 폼만 채워 제출한다 (실패하는 경우도 시험하므로 이동은 기다리지 않는다)
async function submitLogin(page: import("@playwright/test").Page, email: string, password: string) {
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

test("로그인이 필요한 주소에 그냥 가면 로그인 화면으로, 돌아올 주소가 붙는다 (proxy)", async ({ page }) => {
  await page.goto("/projects/new");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprojects%2Fnew/);
});

test("비밀번호가 틀리면 이유를 보여준다", async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, SEED.email, "wrong-password");
  // 본문(main) 안에서 찾는다 — Next.js가 페이지 이동을 화면 낭독기에 알리려고 숨겨 둔 alert 가 하나 더 있기 때문
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("이메일 또는 비밀번호가 틀렸어요.");
});

test("입력칸 규칙에 어긋나면 칸 아래에 이유를 보여준다 (zod)", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("textbox", { name: "이메일" }).fill("not-an-email");
  await page.getByRole("textbox", { name: "사용자 이름" }).fill("AB");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page.getByRole("textbox", { name: "이메일" })).toHaveAccessibleDescription("이메일 형식이 올바르지 않아요");
  await expect(page.getByRole("textbox", { name: "사용자 이름" })).toHaveAccessibleDescription("영문 소문자·숫자·밑줄(_)로 3~20자");
});

test("로그인하면 원래 가려던 곳으로 돌아간다", async ({ page }) => {
  await page.goto("/login?redirect=%2Fdesign-system");
  await submitLogin(page, SEED.email, SEED.password);
  await expect(page).toHaveURL(/\/design-system$/);
  await expect(page.getByRole("banner")).toContainText(SEED.name);
});

test("돌아올 주소에 바깥 사이트를 넣어도 우리 사이트로만 보낸다 (오픈 리다이렉트 방지)", async ({ page }) => {
  await page.goto("/login?redirect=https%3A%2F%2Fevil.example.com");
  await submitLogin(page, SEED.email, SEED.password);
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
});

test("회원가입 → 자동 로그인 → 로그아웃", async ({ page }) => {
  const id = `e2e${Date.now()}`;
  await page.goto("/signup");
  await page.getByRole("textbox", { name: "이메일" }).fill(`${id}@e2e.moa.test`);
  await page.getByRole("textbox", { name: "사용자 이름" }).fill(id);
  await page.getByRole("textbox", { name: "이름", exact: true }).fill("흐름테스트");
  await page.getByLabel("비밀번호").fill("e2e-password-123");
  await page.getByRole("button", { name: "가입하기" }).click();

  const header = page.getByRole("banner");
  await expect(header).toContainText("흐름테스트");
  await header.getByRole("button", { name: "로그아웃" }).click();
  await expect(header.getByRole("link", { name: "로그인" })).toBeVisible();
});
