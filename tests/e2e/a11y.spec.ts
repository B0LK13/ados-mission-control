import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const views = [
  { path: "/overview", heading: "Operational overview" },
  { path: "/tasks", heading: "Tasks & executions" },
  { path: "/campaigns", heading: "Campaigns" },
  { path: "/replay", heading: "Run replay" },
] as const;

for (const view of views) {
  test(`axe: ${view.path} has no serious or critical violations`, async ({ page }) => {
    await page.goto(view.path);
    await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      blocking,
      blocking
        .map(
          (violation) =>
            `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes
              .slice(0, 3)
              .map((node) => node.target.join(" "))
              .join("; ")}`,
        )
        .join("\n"),
    ).toEqual([]);
  });
}
