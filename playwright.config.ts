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
      command: "npm run start -- --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, MISSION_CONTROL_MODE: "live", ADOS_CONTROL_PLANE_ROOT: fixtureRoot, MISSION_CONTROL_PERSISTENCE: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled", BUILD_ID: "e2e-live" },
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3102",
      url: "http://127.0.0.1:3102/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, MISSION_CONTROL_MODE: "live", ADOS_CONTROL_PLANE_ROOT: unavailableRoot, MISSION_CONTROL_PERSISTENCE: "disabled", MISSION_CONTROL_AUTH_MODE: "disabled", BUILD_ID: "e2e-unavailable" },
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3103",
      url: "http://127.0.0.1:3103/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, MISSION_CONTROL_MODE: "live", ADOS_CONTROL_PLANE_ROOT: fixtureRoot, MISSION_CONTROL_PERSISTENCE: "disabled", MISSION_CONTROL_AUTH_MODE: "basic", MISSION_CONTROL_AUTH_USER: "owner", MISSION_CONTROL_AUTH_SECRET: "e2e-only-secret", BUILD_ID: "e2e-auth" },
    },
  ],
  projects: [
    { name: "live-desktop", testMatch: /live\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3101" } },
    { name: "live-mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:3101" } },
    { name: "unavailable", testMatch: /unavailable\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3102" } },
    { name: "authenticated", testMatch: /auth\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3103", httpCredentials: { username: "owner", password: "e2e-only-secret" } } },
  ],
});
