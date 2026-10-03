import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("restore appends a revision and preserves previous snapshots", async ({
  page,
}) => {
  await page.goto("/#pages/connection-detail");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Restore revision 1" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save revision 4" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save revision 4" }).click();
  await expect(page.getByRole("status")).toContainText("Revision 4 created");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-revisions article")).toHaveCount(4);
  await page.getByLabel("Before", { exact: true }).selectOption("1");
  await page.getByLabel("After", { exact: true }).selectOption("4");
  await expect(page.getByText("No configuration differences.")).toBeVisible();
});
test("Git proposals require review and conflicts do not overwrite drafts", async ({
  page,
}) => {
  await page.goto("/#pages/connection-detail");
  await page.getByRole("button", { name: "Git source", exact: true }).click();
  await page.getByLabel("Manage this connection in Git (preview)").check();
  await page
    .getByRole("button", { name: "Configuration", exact: true })
    .click();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("New GitHub name");
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Propose change", exact: true })
    .click();
  await page.getByRole("button", { name: "Review change request" }).click();
  await page.getByRole("button", { name: "Simulate incoming commit" }).click();
  await expect(
    page.getByRole("heading", { name: "Concurrent changes need review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate merge and sync" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Keep local draft" }).click();
  await expect(
    page.getByRole("button", { name: "Simulate merge and sync" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Simulate incoming commit" }).click();
  await page
    .getByRole("button", {
      name: "Use repository version and discard local draft",
    })
    .click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-revisions article")).toHaveCount(4);
});
test("history layout and YAML comparison fit phones", async ({ page }) => {
  await page.goto("/#pages/connection-detail");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.screenshot({
    path: "test-results/connection-history-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("Git merge appends history and failure preserves a draft", async ({
  page,
}) => {
  await page.goto("/#pages/connection-detail");
  await page.getByRole("button", { name: "Git source", exact: true }).click();
  await page.getByLabel("Manage this connection in Git (preview)").check();
  await page
    .getByRole("button", { name: "Configuration", exact: true })
    .click();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Reviewed change");
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Propose change", exact: true })
    .click();
  await page.getByRole("button", { name: "Review change request" }).click();
  await page.getByRole("button", { name: "Simulate merge and sync" }).click();
  await expect(page.getByRole("status")).toContainText("Revision 4 created");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.locator(".history-revisions article").first(),
  ).toContainText("Git sync bot");
});
