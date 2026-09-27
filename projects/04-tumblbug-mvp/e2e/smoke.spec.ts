import { expect, test } from "@playwright/test";

// 연기 테스트(smoke test) — 배포 직후 "불이 붙었나(연기가 나나)"만 빠르게 본다 (14주차 CD)
// 배포된 주소(미리보기·운영)에 돌리므로 규칙이 있다:
//  - DB 에 쓰지 않는다 (운영 데이터를 건드리지 않게) · 예시 계정에 기대지 않는다 (운영 DB 에는 없다)
//  - 프로젝트가 하나도 없는 빈 운영 DB 에서도 통과해야 한다
// 실행: E2E_BASE_URL=https://배포주소 npx playwright test e2e/smoke.spec.ts --project=desktop

test("상태 확인: 서버가 살아 있고 DB 에 닿는다 (+ 기대한 커밋이 배포됐나)", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, db: "ok" });
  // CD 가 EXPECTED_COMMIT 을 주면: 운영 주소가 "옛 배포"가 아니라 방금 배포한 커밋을 가리키는지 확인
  const expected = process.env.EXPECTED_COMMIT?.slice(0, 7);
  if (expected) expect((await res.json()).commit).toBe(expected);
});

test("홈과 목록이 열린다 (프로젝트가 없어도)", async ({ page }) => {
  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page.getByRole("link", { name: "모아 홈" })).toBeVisible();

  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "프로젝트 둘러보기" })).toBeVisible();
});

test("공개 API 가 규칙대로 답한다", async ({ request }) => {
  const res = await request.get("/api/projects?limit=1");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ items: expect.any(Array) });
  expect((await request.get("/api/projects?limit=abc")).status()).toBe(400);
});

test("잠긴 곳은 잠겨 있다: 로그인 필요한 화면·찜 API·예약 작업", async ({ page, request }) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fstudio/);
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();

  expect((await request.get("/api/likes")).status()).toBe(401);
  expect((await request.get("/api/cron/daily")).status()).not.toBe(200); // 비밀값 없이는 실행되지 않는다 (401, 설정 전이면 500)
  // 부하 테스트 주소(16주차)는 배포된 곳에서 "없는 주소" — 비밀값 머리글을 아무렇게나 넣어도
  expect((await request.post("/api/load-test/setup", { headers: { "x-load-test-secret": "guess-guess-guess-guess" } })).status()).toBe(404);
});

test("없는 주소는 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
});
