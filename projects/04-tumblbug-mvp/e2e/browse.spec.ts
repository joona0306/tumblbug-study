import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { Pool } from "pg";

// 8주차 흐름 테스트: 홈·목록(URL 상태)·상세·후원 버튼 상태·리워드 관리
// 예시 데이터(npm run db:seed)를 기준으로 한다
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
test.afterAll(() => pool.end());

const idOf = async (title: string) => (await pool.query<{ id: number }>("select id from project where title = $1", [title])).rows[0].id;

test("홈: 마감 임박·인기 프로젝트가 보이고, 마감 3일 이내는 D-day 배지", async ({ page }) => {
  await page.goto("/");
  const closing = page.getByRole("region", { name: "마감 임박 프로젝트" });
  await expect(closing.getByRole("heading", { name: "골목 고양이 사진집 2쇄" })).toBeVisible();
  await expect(closing.getByText("D-3")).toBeVisible();
  await expect(page.getByRole("region", { name: "인기 프로젝트" }).getByRole("article")).toHaveCount(4);
});

test("목록: 칩을 누르면 주소가 바뀌고 그 카테고리만 보인다 (URL 상태)", async ({ page }) => {
  await page.goto("/projects");
  const chips = page.getByRole("navigation", { name: "카테고리" });
  await chips.getByRole("link", { name: "출판", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\?category=publishing$/);
  await expect(page.getByRole("heading", { level: 3 })).toHaveText(["골목 고양이 사진집 2쇄", "기차로 건넌 대륙, 여행 에세이"]);
  // 새로고침해도 그대로
  await page.reload();
  await expect(chips.getByRole("link", { name: "출판", exact: true })).toHaveAttribute("aria-current", "true");
});

test("목록: '성공' 탭에는 끝난 성공 프로젝트만, 성공 배지와 함께", async ({ page }) => {
  await page.goto("/projects?status=success");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("라탄 컵받침 소량 제작");
  await expect(cards.first()).toContainText("성공");
  await expect(cards.first()).toContainText("마감");
});

test("목록: 주소에 이상한 값을 넣어도 기본값(모금중)으로 보인다", async ({ page }) => {
  await page.goto("/projects?status=hacked&sort=%3Cscript%3E&category=food");
  await expect(page.getByRole("link", { name: "모금중" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("article")).toHaveCount(6);
});

test("상세: 달성률·통계·리워드(남은 수량)가 보이고, 후원 버튼으로 간다", async ({ page }) => {
  await page.goto(`/projects/${await idOf("손으로 두드려 만든 구리 펜던트 조명")}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("손으로 두드려 만든 구리 펜던트 조명");
  const summary = page.getByRole("region", { name: "프로젝트 요약" });
  await expect(summary).toContainText("78%");
  await expect(summary).toContainText("1,560,000원 모임");
  await expect(summary).toContainText("38명");
  await expect(page.getByRole("article", { name: "[얼리버드] 조명 1개" })).toContainText("17개 남음");
  // 모바일은 하단 고정 바, 데스크톱은 요약 안 — 보이는 버튼을 누른다
  await page.getByRole("link", { name: "이 프로젝트 후원하기" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprojects%2F\d+%2Ffund/); // 후원은 로그인 필요 (화면은 10주차)
});

test("상세: 끝난 프로젝트는 후원 버튼이 비활성", async ({ page }) => {
  await page.goto(`/projects/${await idOf("소규모 인디 공연 음원")}`);
  await expect(page.getByRole("button", { name: "마감된 프로젝트예요" }).filter({ visible: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "프로젝트 요약" })).toContainText("실패");
});

test("상세: 내 프로젝트에서는 후원 대신 '수정하기'", async ({ page }) => {
  const id = await idOf("손으로 두드려 만든 구리 펜던트 조명");
  await login(page, "ohneul_workshop@seed.moa.test", `/projects/${id}`);
  await expect(page.getByRole("link", { name: "내 프로젝트 수정하기" }).filter({ visible: true })).toHaveAttribute("href", `/projects/${id}/edit`);
  await expect(page.getByRole("link", { name: "이 프로젝트 후원하기" })).toHaveCount(0);
});

test("리워드: 추가 → 수정 → 삭제, 판매된 리워드는 금액 잠금·삭제 없음", async ({ page }, testInfo) => {
  // 이 테스트만의 프로젝트를 DB에 직접 만든다 (후원이 없어야 삭제를 시험할 수 있다)
  const title = `리워드 테스트 ${testInfo.project.name} ${Date.now()}`;
  const { rows } = await pool.query<{ id: number }>(
    `insert into project (creator_id, title, summary, category, goal_amount, deadline, image_url)
     select id, $1, '요약', 'craft', 100000, (now() at time zone 'Asia/Seoul')::date + 10, 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=1200&q=80&fm=jpg'
     from "user" where email = 'ohneul_workshop@seed.moa.test' returning id`,
    [title],
  );
  const id = rows[0].id;
  try {
    await login(page, "ohneul_workshop@seed.moa.test", `/projects/${id}/edit`);
    const newReward = page.locator("form", { has: page.getByRole("button", { name: "리워드 추가" }) });
    await newReward.getByRole("textbox", { name: "리워드 이름" }).fill("테스트 머그");
    await newReward.getByRole("textbox", { name: "금액 (원)" }).fill("500");
    await newReward.getByRole("button", { name: "리워드 추가" }).click();
    await expect(newReward.getByRole("textbox", { name: "금액 (원)" })).toHaveAccessibleDescription("1,000원 이상 입력해 주세요");

    await newReward.getByRole("textbox", { name: "금액 (원)" }).fill("32,000");
    await newReward.getByRole("textbox", { name: "한정 수량" }).fill("20");
    await newReward.getByLabel("전달 예정 달").fill(await newReward.getByLabel("전달 예정 달").getAttribute("min").then((m) => m ?? ""));
    await newReward.getByRole("button", { name: "리워드 추가" }).click();

    const item = page.getByRole("article", { name: "테스트 머그" });
    await expect(item).toContainText("32,000원 · 테스트 머그");
    await expect(item).toContainText("20개 한정 · 판매 0개");

    await item.getByText("수정", { exact: true }).click();
    await item.getByRole("textbox", { name: "한정 수량" }).fill("");
    await item.getByRole("button", { name: "리워드 저장" }).click();
    await expect(item).toContainText("무제한 · 판매 0개");

    await item.getByRole("button", { name: "테스트 머그 삭제" }).click();
    await expect(page.getByRole("article", { name: "테스트 머그" })).toHaveCount(0);
  } finally {
    await pool.query("delete from project where id = $1", [id]);
  }

  // 판매된 리워드(시드의 얼리버드): 삭제 버튼 없음, 금액 잠금
  const lampId = await idOf("손으로 두드려 만든 구리 펜던트 조명");
  await page.goto(`/projects/${lampId}/edit`);
  const sold = page.getByRole("article", { name: "[얼리버드] 조명 1개" });
  await expect(sold.getByRole("button", { name: /삭제/ })).toHaveCount(0);
  await sold.getByText("수정", { exact: true }).click();
  await expect(sold.getByRole("textbox", { name: "금액 (원)" })).toBeDisabled();
});
