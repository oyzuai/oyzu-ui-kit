import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("full page validates, retains failed drafts, saves and locks identity", async ({
  page,
}) => {
  await page.goto("/#pages/connection");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Source control");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(page.getByLabel("Service URL")).toBeFocused();
  await page.getByLabel("Service URL").fill("https://api.example.com");
  await page.getByLabel("Authentication method").selectOption("reference");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(page.getByLabel("Credential reference")).toBeFocused();
  await page.getByLabel("Credential reference").fill("source-control-token");
  await page.getByRole("button", { name: "Show advanced settings" }).click();
  await page.getByLabel("Request timeout (seconds)").fill("999");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(page.getByLabel("Request timeout (seconds)")).toBeFocused();
  await page.getByLabel("Request timeout (seconds)").fill("60");
  await page.getByLabel("Save behavior").selectOption("fail");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(
    page.getByText(
      "We couldn’t save the connection. Your draft is safe. Try again.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Credential reference")).toHaveValue(
    "source-control-token",
  );
  await page.getByLabel("Save behavior").selectOption("normal");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit connection", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".editor-savebar")).toHaveCount(0);
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Renamed source");
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "source-control",
  );
  await page.getByRole("button", { name: "Cancel changes" }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Source control",
  );
});
test("navigation protects dirty forms and slow saves", async ({ page }) => {
  await page.goto("/#pages/resources");
  await page.getByRole("link", { name: "Connection form" }).click();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Source control");
  await page.getByRole("link", { name: "Pages", exact: true }).click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Source control",
  );
  await page.goBack();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByLabel("Service URL").fill("https://api.example.com");
  await page.getByLabel("Save behavior").selectOption("slow");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel changes" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Pages", exact: true }).click();
  await expect(page).toHaveURL(/#pages\/connection$/);
  await expect(
    page.getByRole("heading", { name: "Edit connection", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Connection name", { exact: true }).fill("Other name");
  await page.getByRole("link", { name: "Pages", exact: true }).click();
  await page.getByRole("button", { name: "Discard and leave" }).click();
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();
});
test("editor fits mobile and has accessible controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/connection");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Source control");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/connection-editor-mobile.png",
    fullPage: true,
  });
});
