import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Browse components" }).click();
});
test("search, filter, sort and paginate resources", async ({ page }) => {
  await expect(page.getByText("1–4 of 6 resources")).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("5–6 of 6 resources")).toBeVisible();
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.getByRole("button", { name: "Resource", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Design assets");
  await page.getByLabel("Search resources").fill("staging-db");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Staging database");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Failed", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Legacy import");
  await page.getByLabel("Search resources").fill("missing");
  await expect(
    page.getByRole("heading", { name: "No matching resources" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("1–4 of 6 resources")).toBeVisible();
});
test("removal requires explicit confirmation and preserves data on failure", async ({
  page,
}) => {
  await page
    .getByRole("checkbox", { name: "Select Production API", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Simulate removal failure" })
    .check();
  await page.getByRole("button", { name: "Remove selected" }).click();
  await expect(
    page.getByRole("button", { name: "Remove resources", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Type remove to confirm").fill("remove");
  await page
    .getByRole("button", { name: "Remove resources", exact: true })
    .click();
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText(
    "Nothing was removed",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Select Production API", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Simulate removal failure" })
    .uncheck();
  await page.getByRole("button", { name: "Remove selected" }).click();
  await expect(page.getByLabel("Type remove to confirm")).toHaveValue("");
  await page.getByLabel("Type remove to confirm").fill("remove");
  await page
    .getByRole("button", { name: "Remove resources", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByText("1–4 of 5 resources")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Select Production API", exact: true }),
  ).toHaveCount(0);
});
test("page selection retains selections across pages and clears explicitly", async ({
  page,
}) => {
  await page.getByRole("checkbox", { name: "Select this page" }).check();
  await expect(page.getByText("4 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("checkbox", { name: "Select this page" }).check();
  await expect(page.getByText("6 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Select this page" }),
  ).not.toBeChecked();
});
test("row actions update state and detail dialog restores focus", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Actions for Production API",
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Pause resource" }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: "Production API" }),
  ).toContainText("Paused");
  await trigger.click();
  await page.getByRole("menuitem", { name: "View details" }).click();
  await expect(page.getByRole("dialog")).toContainText("production-api");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});
test("form controls validate and settings respond", async ({ page }) => {
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Use at least 2 characters.")).toBeVisible();
  await page.getByLabel("Display name").fill("Platform team");
  await page.getByRole("combobox", { name: "Summary frequency" }).click();
  await page.getByRole("option", { name: "Every day" }).click();
  await page.getByLabel("Description Optional").fill("Shared tooling.");
  await expect(page.getByText("15/240 characters")).toBeVisible();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Example preferences saved.")).toBeVisible();
  const review = page.getByRole("switch", { name: "Review changes" });
  await review.click();
  await expect(review).not.toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Organization policy" }),
  ).toBeDisabled();
});
test("loading and error examples recover", async ({ page }) => {
  await page.getByRole("button", { name: "Loading", exact: true }).click();
  await expect(
    page.getByRole("progressbar", { name: "Loading progress" }),
  ).toHaveAttribute("aria-valuenow", "45");
  await page.getByRole("button", { name: "Error", exact: true }).click();
  await expect(page.getByText("Resources couldn’t be loaded")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your next workflow starts here" }),
  ).toBeVisible();
});
test("gallery is accessible and fits mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/gallery-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "test-results/gallery-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: "Select Production API", exact: true })
    .check();
  await page.getByRole("button", { name: "Remove selected" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
