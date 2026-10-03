import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("audit filters, diff, denied event and export", async ({ page }) => {
  await page.goto("/#pages/audit");
  await page.getByLabel("Search audit events").fill("Production GitHub");
  const trigger = page.getByRole("button", {
    name: "Updated Production GitHub",
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toContainText("org/github-token-v1");
  await expect(page.getByRole("dialog")).toContainText(
    "project/github-token-v2",
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Outcome", { exact: true }).selectOption("Denied");
  await expect(page.getByRole("status")).toHaveText("1 events");
  await page
    .getByRole("button", { name: "Deleted Production registry" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "No configuration changed",
  );
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results" }).click();
  await expect((await download).suggestedFilename()).toBe(
    "oyzu-audit-preview.json",
  );
  await page.getByLabel("Search audit events").fill("nothing matches");
  await expect(
    page.getByRole("heading", { name: "No matching events" }),
  ).toBeVisible();
});
test("audit desktop and mobile accessibility", async ({ page }) => {
  await page.goto("/#pages/audit");
  await page.screenshot({ path: "test-results/audit-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Updated Production GitHub" }).click();
  await page.screenshot({ path: "test-results/audit-mobile.png" });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
