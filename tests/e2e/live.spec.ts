import { expect, test } from "@playwright/test";

test("overview and project registry render authoritative state", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: "Operational overview" })).toBeVisible();
  await expect(page.getByLabel("Nine operational questions")).toBeVisible();
  await expect(page.getByText("Production dispatch", { exact: true })).toBeVisible();
  await expect(page.getByText("DATA LINK")).toBeVisible();
  await expect(page.locator(".data-link strong")).toHaveText(/CONNECTING|LIVE|DISCONNECTED|DEGRADED/);
  await expect(page.getByText("FRESHNESS")).toBeVisible();
  await page.getByRole("link", { name: "Projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByText("ADOS control plane", { exact: true })).toBeVisible();
});

test("phase-1 module views render from live fixture projections", async ({ page }) => {
  await page.goto("/workflow");
  await expect(page.getByRole("heading", { name: "Workflow", exact: true })).toBeVisible();
  await expect(page.getByLabel("Workflow nodes")).toBeVisible();

  await page.goto("/handoffs");
  await expect(page.getByRole("heading", { name: "Handoffs", exact: true })).toBeVisible();

  await page.goto("/worktrees");
  await expect(page.getByRole("heading", { name: "Worktrees", exact: true })).toBeVisible();

  await page.goto("/evidence");
  await expect(page.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
  await expect(page.getByText("METADATA ONLY")).toBeVisible();

  await page.goto("/safety");
  await expect(page.getByRole("heading", { name: "Safety", exact: true })).toBeVisible();
  await expect(page.getByLabel("Severity legend")).toBeVisible();
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
  await expect(page).toHaveURL(/status=COMPLETED/);
  await page.getByLabel("Search task, project, agent, or objective").fill("missing-task");
  await expect(page.getByText("No matching tasks")).toBeVisible();
  await expect(page).toHaveURL(/q=missing-task/);
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
  await expect(page.getByText("FRESHNESS", { exact: true })).toBeVisible();
  await page.goto("/owner-gates");
  await expect(page.getByRole("heading", { name: "Owner gates", exact: true })).toBeVisible();
  await expect(page.getByText("gate-e2e-commit-001", { exact: true })).toBeVisible();
  await expect(page.getByText("OWNER_ACTION_REQUIRED: Authorize local commit")).toBeVisible();
  await expect(page.getByText("NO UI ACTION")).toBeVisible();
});

test("phase-1 surface views render workflow handoffs worktrees evidence safety", async ({ page }) => {
  await page.goto("/workflow");
  await expect(page.getByRole("heading", { name: "Workflow", exact: true })).toBeVisible();
  await expect(page.getByLabel("Workflow nodes")).toBeVisible();
  await page.goto("/handoffs");
  await expect(page.getByRole("heading", { name: "Handoffs", exact: true })).toBeVisible();
  await page.goto("/worktrees");
  await expect(page.getByRole("heading", { name: "Worktrees", exact: true })).toBeVisible();
  await page.goto("/evidence");
  await expect(page.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
  await page.goto("/safety");
  await expect(page.getByRole("heading", { name: "Safety", exact: true })).toBeVisible();
});

test("replay UI loads chronological redacted supervisor-run events", async ({ page }) => {
  await page.goto("/replay?campaignId=campaign-replay-001&runId=run-replay-001");
  await expect(page.getByRole("heading", { name: "Run replay", exact: true })).toBeVisible();
  await expect(page.getByText("GET-ONLY REPLAY")).toBeVisible();
  await expect(page.getByText("campaign-replay-001", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("run-replay-001", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "START", exact: true })).toBeVisible();
  await expect(page.getByText("first step", { exact: true })).toBeVisible();
  await expect(page.locator(".timeline-entry")).toHaveCount(3);
  await expect(page.getByText("REDACTED").first()).toBeVisible();
  await expect(page.getByText("sk-abcdefghijklmnopqrstuvwxyz")).toHaveCount(0);
  await expect(page.getByText(/Bearer abcdefghijklmnop/i)).toHaveCount(0);

  await page.goto("/replay?campaignId=missing-campaign&runId=missing-run");
  await expect(page.getByText("Replay unavailable")).toBeVisible();
  await expect(page.getByText(/No supervisor-run evidence directory/i)).toBeVisible();
});

test("SSE data link reconnects after temporary disconnect", async ({ page }) => {
  test.setTimeout(60_000);
  let allowStream = true;
  await page.route("**/api/v1/events/stream", async (route) => {
    if (!allowStream) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.goto("/overview");
  const dataLink = page.locator(".data-link strong");
  await expect(dataLink).toHaveText("LIVE", { timeout: 20_000 });

  allowStream = false;
  await page.reload();
  await expect(dataLink).toHaveText(/DISCONNECTED|CONNECTING/, { timeout: 20_000 });

  allowStream = true;
  // Force a fresh EventSource attempt once the route is open again.
  await page.reload();
  await expect(dataLink).toHaveText("LIVE", { timeout: 30_000 });
});
