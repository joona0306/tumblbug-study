import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 테스트 코드도 DB·Blob에 접근하므로 .env.local 을 읽는다 (CI에서는 워크플로의 env 값)
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// 흐름 테스트(e2e) 설정: 진짜 브라우저를 띄워 사람이 쓰듯 화면을 눌러 본다.
const PORT = 3100;
const isCI = Boolean(process.env.CI);

// 배포된 주소를 테스트할 때 (14주차 CD): E2E_BASE_URL=https://… → 앱을 띄우지 않고 그 주소로 접속한다
const deployedUrl = process.env.E2E_BASE_URL;
// Vercel 미리보기 주소는 "배포 보호"로 막혀 있다 → 자동화용 우회 비밀값을 헤더로 보낸다 (Vercel 설정의 Protection Bypass for Automation)
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  // 진짜 DB·사진 저장소를 쓰므로 화면 확인은 10초까지 기다린다 (내 컴퓨터 → 해외 리전 DB는 쿼리마다 약 0.1초)
  expect: { timeout: 10_000 },
  // CI에서는 실수로 남긴 test.only 를 막고, 가끔 생기는 일시적 실패를 한 번 더 시도한다
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: deployedUrl ?? `http://localhost:${PORT}`,
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
    // 실패했을 때만 과정 기록(trace)을 남겨 원인을 볼 수 있게 한다
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } }, // 모바일 우선
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // 테스트 전에 앱을 띄운다. CI는 이미 빌드한 결과로, 내 컴퓨터는 개발 서버로. (배포된 주소를 테스트할 때는 띄우지 않는다)
  webServer: deployedUrl
    ? undefined
    : {
        command: isCI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
