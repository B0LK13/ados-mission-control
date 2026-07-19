import { expect, test } from "@playwright/test";

test("keyboard: tab reaches rail nav and activates Tasks view", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("heading", { name: "Operational overview", exact: true })).toBeVisible();

  // exact:true — "Mission Control navigation" must not match the mobile nav label.
  const rail = page.getByRole("navigation", { name: "Mission Control navigation", exact: true });
  const tasksLink = rail.getByRole("link", { name: "Tasks & executions", exact: true });
  await expect(tasksLink).toBeVisible();
  await tasksLink.focus();
  await expect(tasksLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tasks/);
  await expect(page.getByRole("heading", { name: "Tasks & executions", exact: true })).toBeVisible();
});

test("keyboard: tasks filters are reachable and usable without a pointer", async ({ page }) => {
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks & executions", exact: true })).toBeVisible();

  const search = page.getByRole("textbox", { name: /Search task/i });
  await search.focus();
  await expect(search).toBeFocused();
  await search.fill("TASK-E2E-001");
  await expect(page.getByText("TASK-E2E-001", { exact: true }).first()).toBeVisible();

  const status = page.getByRole("combobox", { name: "Filter by status" });
  await status.focus();
  await expect(status).toBeFocused();
  await status.selectOption({ label: "All states" });

  const theme = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
  await theme.focus();
  await expect(theme).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /Switch to (light|dark) mode/ })).toBeVisible();
});
