import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { login } from "./helpers";

// 19주차 개선 ①: 배송지에서 무엇이 틀렸는지 "그 칸에서" 바로 알게 (18주차 우선순위 A — 가상 사례의 설문 1·2·4번)
// 먼저 이 테스트를 쓰고 → 고치기 전 코드에서 실패하는 것을 확인 → 고쳐서 통과시킨다 (개선 전후 기록)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
test.afterAll(() => pool.end());

async function openShippingStep(page: import("@playwright/test").Page) {
  const { rows } = await pool.query<{ id: number }>("select id from project where title = $1 order by id desc limit 1", ["산과 들을 담은 수제 머그 2차"]);
  const id = rows[0].id;
  await login(page, "supporter_kim@seed.moa.test", `/projects/${id}/fund`);
  const main = page.getByRole("main");
  await main.getByText("머그 2개 세트").click();
  await main.getByRole("button", { name: "다음" }).click();
  await expect(page).toHaveURL(`/projects/${id}/fund?step=2`);
  return main;
}

test("틀린 칸마다 이유가 그 칸 아래에 보이고, 첫 번째 틀린 칸으로 이동한다", async ({ page }) => {
  const main = await openShippingStep(page);
  const name = main.getByRole("textbox", { name: "받는 분" });
  const phone = main.getByRole("textbox", { name: "연락처" });
  const address = main.getByRole("textbox", { name: "주소" });
  await name.fill("김모아");
  await phone.fill("1234");
  await address.fill("");
  await main.getByRole("button", { name: "다음: 확인" }).click();

  // 칸이 "틀렸다"고 표시되고, 그 칸의 설명으로 이유가 연결된다 (화면 낭독기도 이유를 읽는다)
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(phone).toHaveAccessibleDescription(/010-1234-5678 모양/);
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await expect(address).toHaveAccessibleDescription(/주소를 입력해 주세요/);
  await expect(name).not.toHaveAttribute("aria-invalid", "true");

  // 첫 번째 틀린 칸(연락처)으로 이동 → 이유가 화면 안에 보인다 (휴대폰에서 아래쪽에 숨지 않게)
  await expect(phone).toBeFocused();
  await expect(main.getByText("연락처는 010-1234-5678 모양으로 입력해 주세요")).toBeInViewport();
});

test("고치는 대로 표시가 사라지고, 다 고치면 다음 단계로", async ({ page }) => {
  const main = await openShippingStep(page);
  const phone = main.getByRole("textbox", { name: "연락처" });
  await main.getByRole("textbox", { name: "받는 분" }).fill("김모아");
  await phone.fill("1234");
  await main.getByRole("textbox", { name: "주소" }).fill("서울시 중구 세종대로 1");
  await main.getByRole("button", { name: "다음: 확인" }).click();
  await expect(phone).toHaveAttribute("aria-invalid", "true");

  await phone.fill("010-1234-5678");
  await expect(phone).not.toHaveAttribute("aria-invalid", "true"); // 다시 누르지 않아도 바로
  await main.getByRole("button", { name: "다음: 확인" }).click();
  await expect(page).toHaveURL(/step=3/);
});

test("배송지를 누가 보는지와, 테스트 결제라 가짜 주소도 된다는 안내가 있다", async ({ page }) => {
  const main = await openShippingStep(page);
  await expect(main).toContainText("이 프로젝트의 창작자에게만 보여요");
  await expect(main).toContainText("가짜 주소");
});
