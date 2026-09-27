import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 15주차: 퍼널 기록 — 상세 보기·리워드·배송지는 브라우저가 알리고, 결제 요청·결제 완료는 서버만 기록한다
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const MUG = "산과 들을 담은 수제 머그 2차";
const projectIdOf = async (title: string) => (await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [title])).rows[0].id;
const stepsOf = async (visitorId: string) =>
  (await pool.query<{ step: string }>("select step from funnel_event where visitor_id = $1 order by created_at", [visitorId])).rows.map((r) => r.step);

test.afterAll(() => pool.end());

test("상세 → 리워드 → 배송지에 도착하면 단계가 기록된다 (방문자 쿠키로, 새로고침해도 한 번)", async ({ page, context }) => {
  const id = await projectIdOf(MUG);
  await login(page, "supporter_lee@seed.moa.test", `/projects/${id}`);
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "moa-vid")?.value).toBeTruthy();
  const visitorId = (await context.cookies()).find((c) => c.name === "moa-vid")!.value;
  try {
    await expect.poll(() => stepsOf(visitorId)).toEqual(["view"]);
    await page.reload();

    await page.goto(`/projects/${id}/fund`);
    await expect(page.getByRole("heading", { name: "리워드를 골라 주세요" })).toBeVisible();
    await page.getByRole("main").getByText("머그 1개", { exact: true }).click();
    await page.getByRole("main").getByRole("button", { name: "다음" }).click();
    await expect(page.getByRole("heading", { name: "리워드를 받을 곳" })).toBeVisible();

    await expect.poll(() => stepsOf(visitorId)).toEqual(["view", "reward", "shipping"]);
  } finally {
    await pool.query("delete from funnel_event where visitor_id = $1", [visitorId]);
  }
});

test("브라우저는 '결제 요청'·'결제 완료'를 보낼 수 없다 (400)", async ({ request }) => {
  const id = await projectIdOf(MUG);
  for (const step of ["payment_request", "paid"]) {
    const res = await request.post("/api/funnel", { data: { projectId: id, step } });
    expect(res.status()).toBe(400);
  }
});
