import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", "ados");
const unavailableRoot = path.join(process.cwd(), "tests", "fixtures", "source-does-not-exist");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/start-e2e-server.mjs --port 3201",
      url: "http://127.0.0.1:3201/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...process.env, MISSION_CONTROL_MODE: "live", ADOS_CONTROL_PLANE_ROOT: fixtureRoot, MISSION_CONTROL_PERSISTENCE: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled", BUILD_ID: "e2e-live" },
    },
    {
      command: "node scripts/start-e2e-server.mjs --port 3202",
      url: "http://127.0.0.1:3202/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...process.env, MISSION_CONTROL_MODE: "live", ADOS_CONTROL_PLANE_ROOT: unavailableRoot, MISSION_CONTROL_PERSISTENCE: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled", BUILD_ID: "e2e-unavailable" },
    },
    {
      command: "node scripts/start-e2e-server.mjs --port 3203",
      url: "http://127.0.0.1:3203/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...process.env, MISSION_CONTROL_MODE: "live", ADOS_CONTROL_PLANE_ROOT: fixtureRoot, MISSION_CONTROL_PERSISTENCE: "disabled", MISSION_CONTROL_AUTH_MODE: "basic", MISSION_CONTROL_AUTH_USER: "owner", MISSION_CONTROL_AUTH_SECRET: "e2e-only-secret", BUILD_ID: "e2e-auth" },
    },
  ],
  projects: [
    { name: "live-desktop", testMatch: /live\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3201" } },
    {
      name: "live-v3",
      testMatch: /v3-surfaces\.spec\.ts/,
      timeout: 90_000,
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3201", video: "off", trace: "on-first-retry" },
    },
    { name: "live-keyboard", testMatch: /keyboard\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3201" } },
    { name: "live-a11y", testMatch: /a11y\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3201" } },
    { name: "live-mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:3201" } },
    { name: "unavailable", testMatch: /unavailable\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3202" } },
    { name: "authenticated", testMatch: /auth\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3203", httpCredentials: { username: "owner", password: "e2e-only-secret" } } },
  ],
});
