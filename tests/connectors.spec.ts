import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("catalog searches and preserves filters across guarded wizard navigation", async ({
  page,
}) => {
  await page.goto("/#pages/connectors");
  await page.getByRole("button", { name: "Infrastructure" }).click();
  await page.getByLabel("Search connectors").fill("terraform");
  await page.getByRole("link", { name: /Terraform Cloud/ }).click();
  await expect(
    page.getByRole("heading", { name: "Connect Terraform Cloud" }),
  ).toBeVisible();
  await expect(page.getByLabel("Current context")).toHaveCount(0);
  await expect(page.getByLabel("Service URL")).toHaveValue(
    "https://app.terraform.io",
  );
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Infrastructure");
  await page.getByRole("link", { name: "Change connector" }).click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Infrastructure",
  );
  await page.getByRole("link", { name: "Change connector" }).click();
  await page.getByRole("button", { name: "Discard and leave" }).click();
  await expect(page.getByLabel("Search connectors")).toHaveValue("terraform");
  await page.getByLabel("Search connectors").fill("nothing-here");
  await expect(
    page.getByRole("heading", { name: "No connectors found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".connector-tile")).toHaveCount(13);
});
test("catalog logos load and mobile remains accessible", async ({ page }) => {
  await page.goto("/#pages/connectors");
  await page.locator(".connector-tile img").evaluateAll(async (images) => {
    await Promise.all(images.map((img) => (img as HTMLImageElement).decode()));
  });
  await page.screenshot({ path: "test-results/connectors-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/connectors-mobile.png" });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
