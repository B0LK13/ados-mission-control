import { expect, test } from "@playwright/test";

test("overview and project registry render authoritative state", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: "Operational overview" })).toBeVisible();
  await expect(page.getByText("DATA LINK")).toBeVisible();
  await page.getByRole("link", { name: "Projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByText("ADOS control plane", { exact: true })).toBeVisible();
});

test("approval and task filters update visible rows", async ({ page }) => {
  await page.goto("/approvals");
  await expect(page.getByText("approval-e2e-deploy", { exact: true })).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("APPROVED");
  await expect(page.getByText("approval-e2e-deploy", { exact: true })).toBeVisible();
  await page.getByLabel("Search approval ID, action, or scope").fill("no-match");
  await expect(page.getByText("No matching approvals")).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByText("TASK-E2E-001", { exact: true })).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("COMPLETED");
  await expect(page.getByText("TASK-E2E-001", { exact: true })).toBeVisible();
  await page.getByLabel("Search task, project, agent, or objective").fill("missing-task");
  await expect(page.getByText("No matching tasks")).toBeVisible();
});

test("parsing warning and routing incident states are visible", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByText("PARTIAL SOURCE WARNINGS")).toBeVisible();
  await page.goto("/routing-incidents");
  await expect(page.getByRole("heading", { name: "Routing incidents" })).toBeVisible();
  await expect(page.getByText("routing-event-3", { exact: true })).toBeVisible();
});

test("campaigns and owner gates render from live fixture projections", async ({ page }) => {
  await page.goto("/campaigns");
  await expect(page.getByRole("heading", { name: "Campaigns", exact: true })).toBeVisible();
  await expect(page.getByText("campaign-e2e-pilot-001", { exact: true })).toBeVisible();
  await expect(page.getByText("FRESHNESS")).toBeVisible();
  await page.goto("/owner-gates");
  await expect(page.getByRole("heading", { name: "Owner gates", exact: true })).toBeVisible();
  await expect(page.getByText("gate-e2e-commit-001", { exact: true })).toBeVisible();
  await expect(page.getByText("OWNER_ACTION_REQUIRED: Authorize local commit")).toBeVisible();
  await expect(page.getByText("NO UI ACTION")).toBeVisible();
});
