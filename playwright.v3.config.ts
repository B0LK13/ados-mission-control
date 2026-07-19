import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", "ados");

/** Slim config for V3 surface smoke — single webServer avoids port races with full suite. */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    baseURL: "http://127.0.0.1:3211",
  },
  webServer: {
    command: "node scripts/start-e2e-server.mjs --port 3211",
    url: "http://127.0.0.1:3211/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      MISSION_CONTROL_MODE: "live",
      ADOS_CONTROL_PLANE_ROOT: fixtureRoot,
      MISSION_CONTROL_PERSISTENCE: "disabled",
      MISSION_CONTROL_AUTH_MODE: "disabled",
      BUILD_ID: "e2e-v3",
    },
  },
  projects: [
    { name: "live-v3", testMatch: /v3-surfaces\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
  ],
});
