import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.MISSION_CONTROL_URL || "http://127.0.0.1:3100";
const outputRoot = process.env.MISSION_CONTROL_EVIDENCE_ROOT || path.join(process.cwd(), "evidence", "deployment-v2", "screenshots");
const views = ["overview", "projects", "agents", "tasks", "approvals", "timeline", "routing-incidents"];

async function stagingCredentials() {
  const values = { ...process.env };
  try {
    const file = await readFile(path.join(process.cwd(), ".mission-control-auth.env"), "utf8");
    for (const line of file.split(/\r?\n/)) {
      const separator = line.indexOf("=");
      if (separator > 0) values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  } catch {}
  if (!values.MISSION_CONTROL_AUTH_USER || !values.MISSION_CONTROL_AUTH_SECRET) return undefined;
  return { username: values.MISSION_CONTROL_AUTH_USER, password: values.MISSION_CONTROL_AUTH_SECRET };
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark", httpCredentials: await stagingCredentials() });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const view of views) {
    await page.goto(`${baseUrl}/${view}`, { waitUntil: "domcontentloaded" });
    await page.locator("#main-content h1").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector(".data-link strong")?.textContent === "LIVE", undefined, { timeout: 10_000 });
    await page.screenshot({ path: path.join(outputRoot, `${view}.png`), fullPage: true });
  }
} finally {
  await browser.close();
}

console.log(`Captured ${views.length} redacted UI screenshots from ${baseUrl}.`);
