import { expect, test } from "@playwright/test";

/**
 * V3 surface smoke — flags remain fail-closed by default in the live e2e server.
 * Never weakens authority assertions (no approve/dispatch when Phase 6/7 off).
 */
test("phase 5 intelligence surfaces render without authority upgrade", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: "Operational overview" })).toBeVisible();
  await expect(page.getByLabel("Nine operational questions")).toBeVisible();
  await expect(page.getByText("Path / worktree conflicts", { exact: true })).toBeVisible();
  await expect(page.getByText("CONFLICT / INFERRED")).toBeVisible();

  await page.goto("/safety");
  await expect(page.getByRole("heading", { name: "Safety", exact: true })).toBeVisible();
  await expect(page.getByText("INFERRED ONLY")).toBeVisible();
  await expect(page.getByText("OBSERVATION ONLY")).toBeVisible();

  await page.goto("/agents");
  await expect(page.getByRole("heading", { name: "Agents & runtimes" })).toBeVisible();
  await page.locator(".agent-card").first().click();
  await expect(page.getByText("NO PROMOTE / LEASE CONTROLS")).toBeVisible();

  await page.goto("/evidence");
  await expect(page.getByText("METADATA ONLY")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify hash" }).first()).toBeVisible();
});

test("phase 6 operations panel stays disabled without Phase 6 flag", async ({ page }) => {
  await page.goto("/operations");
  await expect(page.getByRole("heading", { name: "Controlled operations", exact: true })).toBeVisible();
  await expect(page.getByText("PHASE 3 DISABLED")).toBeVisible();
  await expect(page.getByText("PHASE 6 DISABLED")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request approved validate" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "File approved integration request" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Request approved review pickup" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Request approved dispatch" })).toBeDisabled();
});

test("phase 7 alerts surface is fail-closed when alerts disabled", async ({ page }) => {
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Alerts", exact: true })).toBeVisible();
  await expect(page.getByText("ALERTS DISABLED")).toBeVisible();
  await expect(page.getByText("ALERTS OFF")).toBeVisible();
  await expect(page.getByLabel("Mobile alert digest")).toBeVisible();
  await expect(page.getByText("Digest disabled")).toBeVisible();
});

test("fleet observation remains non-authoritative when disabled", async ({ page }) => {
  await page.goto("/fleet");
  await expect(page.getByRole("heading", { name: "Fleet", exact: true })).toBeVisible();
  await expect(page.getByText("FLEET MODE DISABLED")).toBeVisible();
  await expect(page.getByText("FLEET OFF")).toBeVisible();
});
