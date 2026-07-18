import { expect, test } from "@playwright/test";

test("staging authentication protects UI and read APIs while health remains probeable", async ({ page, playwright }) => {
  await page.goto("/overview");
  await expect(page.getByRole("heading", { level: 1, name: /operational overview/i })).toBeVisible();

  const anonymous = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3103",
    httpCredentials: { username: "invalid", password: "invalid" },
  });
  try {
    const protectedResponse = await anonymous.get("/api/v1/snapshot");
    expect(protectedResponse.status()).toBe(401);
    expect(protectedResponse.headers()["www-authenticate"]).toContain("Basic realm=");

    const healthResponse = await anonymous.get("/api/health");
    expect(healthResponse.status()).toBe(200);
  } finally {
    await anonymous.dispose();
  }
});
