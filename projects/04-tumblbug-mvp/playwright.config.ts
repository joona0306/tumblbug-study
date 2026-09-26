import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 테스트 코드도 DB·Blob에 접근하므로 .env.local 을 읽는다 (CI에서는 워크플로의 env 값)
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// 흐름 테스트(e2e) 설정: 진짜 브라우저를 띄워 사람이 쓰듯 화면을 눌러 본다.
const PORT = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  // CI에서는 실수로 남긴 test.only 를 막고, 가끔 생기는 일시적 실패를 한 번 더 시도한다
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // 실패했을 때만 과정 기록(trace)을 남겨 원인을 볼 수 있게 한다
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } }, // 모바일 우선
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // 테스트 전에 앱을 띄운다. CI는 이미 빌드한 결과로, 내 컴퓨터는 개발 서버로.
  webServer: {
    command: isCI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
