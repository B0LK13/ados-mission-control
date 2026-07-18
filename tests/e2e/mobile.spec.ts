import { expect, test } from "@playwright/test";

test("responsive navigation exposes every required V1 view", async ({ page }) => {
  await page.goto("/overview");
  const mobileNav = page.getByRole("navigation", { name: "Mobile Mission Control navigation" });
  await expect(mobileNav).toBeVisible();
  for (const label of ["Overview", "Projects", "Agents & runtimes", "Tasks & executions", "Approvals", "Evidence & audit", "Routing incidents"]) {
    await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
  }
});
