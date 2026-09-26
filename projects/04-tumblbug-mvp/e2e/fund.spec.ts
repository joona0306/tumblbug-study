import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 10주차 흐름 테스트: 여러 단계 후원 (① 리워드 → ② 배송지 → ③ 확인)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const SUPPORTER = "supporter_kim@seed.moa.test";

async function projectIdByTitle(title: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", [title]);
  return rows[0].id;
}

test.afterAll(() => pool.end());

async function openFund(page: Page, title: string, step = "") {
  const id = await projectIdByTitle(title);
  const path = `/projects/${id}/fund${step}`;
  await login(page, SUPPORTER, path);
  return id;
}

test("로그인하지 않으면 로그인 화면으로 보낸다", async ({ page }) => {
  const id = await projectIdByTitle("산과 들을 담은 수제 머그 2차");
  await page.goto(`/projects/${id}/fund`);
  await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(`/projects/${id}/fund`)}`);
});

test("리워드·수량 → 배송지 → 확인까지 가고, 새로고침해도 고른 내용이 남는다", async ({ page }) => {
  const id = await openFund(page, "산과 들을 담은 수제 머그 2차");
  const main = page.getByRole("main");

  // ① 리워드 + 수량 2 + 추가 후원금 → 총액이 바로 바뀐다
  await main.getByText("머그 2개 세트").click();
  await main.getByRole("button", { name: "머그 2개 세트 수량 늘리기" }).click();
  await main.getByRole("textbox", { name: "추가 후원금 (원, 선택)" }).fill("2000");
  await expect(page.getByTestId("total")).toHaveText("118,000원");
  await main.getByRole("button", { name: "다음" }).click();

  // ② 배송지: 잘못된 연락처는 넘어가지 못한다
  await expect(page).toHaveURL(`/projects/${id}/fund?step=2`);
  await main.getByRole("textbox", { name: "받는 분" }).fill("김모아");
  await main.getByRole("textbox", { name: "연락처" }).fill("1234");
  await main.getByRole("textbox", { name: "주소" }).fill("서울시 중구 세종대로 1, 101동 101호");
  await main.getByRole("button", { name: "다음: 확인" }).click();
  await expect(main.getByRole("alert")).toContainText("연락처");
  await main.getByRole("textbox", { name: "연락처" }).fill("010-1234-5678");
  await main.getByRole("button", { name: "다음: 확인" }).click();

  // ③ 확인: 고른 내용이 그대로
  await expect(page).toHaveURL(`/projects/${id}/fund?step=3`);
  const summary = main.getByRole("group", { name: "후원 내용", exact: true });
  await expect(summary).toContainText("머그 2개 세트 × 2");
  await expect(summary).toContainText("118,000원");
  await expect(main.getByRole("group", { name: "배송지", exact: true })).toContainText("010-1234-5678");

  // 새로고침해도 (sessionStorage 에 저장돼 있으니) 그대로
  await page.reload();
  await expect(main.getByRole("group", { name: "후원 내용", exact: true })).toContainText("머그 2개 세트 × 2");

  // 결제하기 → 서버가 다시 계산한 금액이 같다 (결제창 연결은 11주차)
  await main.getByRole("button", { name: "118,000원 결제하기" }).click();
  await expect(main.getByRole("status")).toContainText("서버 확인 완료: 118,000원");

  // 뒤로 가면 배송지가 채워진 채로
  await page.goBack();
  await expect(main.getByRole("textbox", { name: "받는 분" })).toHaveValue("김모아");
});

test("앞 단계를 건너뛰고 들어오면 1단계로 보낸다", async ({ page }) => {
  const id = await openFund(page, "산과 들을 담은 수제 머그 2차", "?step=3");
  await expect(page).toHaveURL(`/projects/${id}/fund?step=1`);
  await expect(page.getByRole("heading", { name: "리워드를 골라 주세요" })).toBeVisible();
});

test("리워드 없이 후원할 때는 1,000원 이상이어야 하고, 배송지 단계를 건너뛴다", async ({ page }) => {
  const id = await openFund(page, "산과 들을 담은 수제 머그 2차");
  const main = page.getByRole("main");
  await main.getByText("리워드 없이 후원하기").click();
  await main.getByRole("textbox", { name: "후원 금액 (원)" }).fill("500");
  await main.getByRole("button", { name: "다음" }).click();
  await expect(main.getByRole("alert")).toContainText("1,000원");

  await main.getByRole("textbox", { name: "후원 금액 (원)" }).fill("5000");
  await main.getByRole("button", { name: "다음" }).click();
  await expect(page).toHaveURL(`/projects/${id}/fund?step=3`);
  await expect(main.getByRole("group", { name: "후원 내용", exact: true })).toContainText("5,000원");
  await expect(main.getByRole("group", { name: "배송지", exact: true })).toHaveCount(0);
});

test("마감된 프로젝트와 내 프로젝트에는 후원할 수 없다", async ({ page, context }) => {
  await openFund(page, "라탄 컵받침 소량 제작");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("마감된 프로젝트예요");

  // 창작자(흙과불)로 다시 로그인 — 쿠키를 지워 로그아웃 상태로 만든 뒤
  await context.clearCookies();
  const id = await projectIdByTitle("산과 들을 담은 수제 머그 2차");
  await login(page, "heuk_bul@seed.moa.test", `/projects/${id}/fund`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("내 프로젝트에는 후원할 수 없어요");
});
