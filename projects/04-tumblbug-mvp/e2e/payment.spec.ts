import { expect, type Frame, type Page, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 11주차 흐름 테스트: 결제 승인·실패·내 후원 내역·웹훅
// 결제 대기 후원을 DB에 직접 만들어 "결제창에서 돌아온 순간"을 흉내 낸다 (토스 결제창 없이도 CI에서 돈다)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const SUPPORTER = "supporter_kim@seed.moa.test";
const MUG = "산과 들을 담은 수제 머그 2차";
const hasToss = Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY);
const createdOrders: string[] = [];

async function one<T>(sql: string, params: unknown[]): Promise<T> {
  return (await pool.query(sql, params)).rows[0] as T;
}

// 결제 대기(pending) 후원 하나 — startFunding 이 만드는 것과 같은 모양
async function pendingFunding(amount = 5_000) {
  const { id: projectId } = await one<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [MUG]);
  const { id: supporterId } = await one<{ id: string }>('select id from "user" where email = $1', [SUPPORTER]);
  const orderId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  createdOrders.push(orderId);
  await pool.query("insert into funding (project_id, supporter_id, amount, order_id) values ($1, $2, $3, $4)", [projectId, supporterId, amount, orderId]);
  return { projectId, orderId, amount };
}

const fundingOf = (orderId: string) => one<{ status: string; fail_reason: string | null }>("select status, fail_reason from funding where order_id = $1", [orderId]);

test.afterAll(async () => {
  await pool.query("delete from payment_event where order_id = any($1)", [createdOrders]);
  await pool.query("delete from funding where order_id = any($1)", [createdOrders]);
  await pool.end();
});

test("성공 주소의 금액을 조작하면 승인하지 않는다", async ({ page }) => {
  const order = await pendingFunding(5_000);
  await login(page, SUPPORTER, `/projects/${order.projectId}/fund/success?paymentKey=tampered&orderId=${order.orderId}&amount=100`);
  await expect(page.getByRole("heading", { name: "결제하지 못했어요" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("결제 금액이 올바르지 않아");
  expect(await fundingOf(order.orderId)).toEqual({ status: "failed", fail_reason: "AMOUNT_MISMATCH" });
});

test("남의 주문 번호로는 결제 결과 화면을 볼 수 없다", async ({ page }) => {
  const order = await pendingFunding();
  await login(page, "supporter_lee@seed.moa.test", `/projects/${order.projectId}/fund/success?paymentKey=x&orderId=${order.orderId}&amount=${order.amount}`);
  await expect(page.getByRole("heading", { name: "주문을 찾을 수 없어요" })).toBeVisible();
  expect((await fundingOf(order.orderId)).status).toBe("pending");
});

test("결제창에서 취소하면 실패로 기록하고, 다시 결제할 수 있게 안내한다", async ({ page }) => {
  const order = await pendingFunding();
  await login(page, SUPPORTER, `/projects/${order.projectId}/fund/fail?code=PAY_PROCESS_CANCELED&message=${encodeURIComponent("사용자에 의해 결제가 취소되었습니다.")}&orderId=${order.orderId}`);
  await expect(page.getByRole("heading", { name: "결제를 취소했어요" })).toBeVisible();
  await expect(page.getByRole("link", { name: "다시 결제하기" })).toHaveAttribute("href", `/projects/${order.projectId}/fund?step=3`);
  expect(await fundingOf(order.orderId)).toEqual({ status: "failed", fail_reason: "PAY_PROCESS_CANCELED" });
});

test("내 후원 내역: 로그인이 필요하고, 결제 완료 후원이 보인다", async ({ page }) => {
  await page.goto("/me/fundings");
  await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent("/me/fundings")}`);

  await login(page, SUPPORTER, "/me/fundings");
  await expect(page.getByRole("heading", { name: "내 후원 내역" })).toBeVisible();
  await expect(page.getByRole("main").getByText("결제 완료").first()).toBeVisible(); // 예시 데이터의 결제 완료 후원
});

test("웹훅: 모양이 틀리면 400, 토스가 모르는 결제면 무시(200)", async ({ request }) => {
  const bad = await request.post("/api/webhooks/toss", { data: { hello: "world" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error.code).toBe("INVALID_BODY");

  const order = await pendingFunding();
  const forged = await request.post("/api/webhooks/toss", {
    data: { eventType: "PAYMENT_STATUS_CHANGED", createdAt: new Date().toISOString(), data: { paymentKey: "forged-key", orderId: order.orderId, status: "DONE" } },
  });
  expect(forged.status()).toBe(200);
  expect(await forged.json()).toEqual({ result: "ignored" });
  expect((await fundingOf(order.orderId)).status).toBe("pending"); // 가짜 "DONE" 알림으로 결제 완료가 되지 않았다
});

// ---------- 토스 테스트 결제창을 끝까지 거치는 결제 (토스 키가 있는 내 컴퓨터에서만) ----------

// 토스 테스트 결제창: 화면에 따라 "다음·결제하기"를 누르거나, 화면에 안내된 테스트 비밀번호(000000)를 넣는다
async function finishTossTestPayment(page: Page) {
  for (let round = 0; round < 12 && !/\/fund\/(success|fail)/.test(page.url()); round++) {
    await page.waitForTimeout(2_000);
    const frame: Frame | undefined = page.frames().find((f) => f.url().includes("toss.im"));
    if (!frame) continue;
    const text = await frame.locator("body").innerText().catch(() => "");
    if (text.includes("비밀번호")) {
      for (let i = 0; i < 6; i++) await frame.getByText("0", { exact: true }).click();
    } else {
      const next = frame.getByRole("button", { name: /^(다음|결제하기)$/ });
      if (await next.count()) await next.first().click();
    }
  }
}

test("토스 테스트 결제: 리워드 결제 → 승인 → 내 후원 내역, 재고 1개 차감", async ({ page, isMobile }) => {
  test.skip(!hasToss, "토스 테스트 키가 없어서 건너뜀 (CI)");
  test.skip(isMobile, "외부 결제창을 두 기기에서 동시에 돌리지 않는다 — 데스크톱에서만");
  test.setTimeout(120_000);

  const { id: projectId } = await one<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [MUG]);
  const { id: rewardId, sold_qty: before } = await one<{ id: number; sold_qty: number }>("select id, sold_qty from reward where project_id = $1 and title = '머그 1개'", [projectId]);
  let orderId: string | undefined;

  try {
    await login(page, SUPPORTER, `/projects/${projectId}/fund`);
    const main = page.getByRole("main");
    await main.getByText("머그 1개", { exact: true }).click();
    await main.getByRole("button", { name: "다음" }).click();
    await main.getByRole("textbox", { name: "받는 분" }).fill("김모아");
    await main.getByRole("textbox", { name: "연락처" }).fill("010-1234-5678");
    await main.getByRole("textbox", { name: "주소" }).fill("서울시 중구 세종대로 1");
    await main.getByRole("button", { name: "다음: 확인" }).click();
    await main.getByRole("button", { name: "32,000원 결제하기" }).click({ timeout: 30_000 });

    await finishTossTestPayment(page);
    await expect(page).toHaveURL(/\/fund\/success/, { timeout: 30_000 });
    orderId = new URL(page.url()).searchParams.get("orderId") ?? undefined;
    if (orderId) createdOrders.push(orderId);
    await expect(page.getByRole("heading", { name: "후원해 주셔서 고마워요!" })).toBeVisible();

    const { sold_qty: after } = await one<{ sold_qty: number }>("select sold_qty from reward where id = $1", [rewardId]);
    expect(after).toBe(before + 1);

    await page.getByRole("link", { name: "내 후원 내역 보기" }).click();
    await expect(page.getByRole("main").getByRole("listitem").first()).toContainText("머그 1개 × 1");
  } finally {
    // 이 테스트가 판 수량을 되돌린다 (후원 줄은 afterAll 에서 지운다)
    if (orderId) await pool.query("update reward set sold_qty = sold_qty - 1 where id = $1 and exists (select 1 from funding where order_id = $2 and status = 'paid')", [rewardId, orderId]);
  }
});
