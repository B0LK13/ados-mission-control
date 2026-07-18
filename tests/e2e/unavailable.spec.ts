import { expect, test } from "@playwright/test";

test("unavailable ADOS source renders a safe truthful empty state", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("status").getByText("ADOS SOURCE UNAVAILABLE")).toBeVisible();
  await expect(page.getByText("UNAVAILABLE", { exact: true }).first()).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText("Project registry unavailable")).toBeVisible();
});
