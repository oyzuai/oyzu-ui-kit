import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("picker searches identifiers, supports keyboard selection, recent choices and clearing", async ({
  page,
}) => {
  await page.goto("/#pages/resources");
  await page
    .getByRole("button", { name: "Filter by project: All projects" })
    .click();
  const search = page.getByRole("textbox", { name: "Search resources" });
  await expect(search).toBeFocused();
  await search.fill("data-services");
  await search.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  const trigger = page.getByRole("button", {
    name: "Filter by project: Data services",
  });
  await expect(trigger).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Data services");
  await trigger.click();
  await expect(
    page.getByRole("region", { name: "Recent choices" }),
  ).toContainText("Data services");
  await search.fill("nothing-matches");
  await expect(
    page.getByRole("heading", { name: "No matching resources" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(search).toHaveValue("");
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
});
test("picker fits a phone and passes accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/resources");
  await page
    .getByRole("button", { name: "Filter by project: All projects" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeLessThanOrEqual(844);
  await page.screenshot({
    path: "test-results/picker-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Documentation documentation Developer experience",
    })
    .click();
  await expect(page.locator("tbody")).toContainText("Documentation");
});
