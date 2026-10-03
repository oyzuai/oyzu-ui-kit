import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("account sections preserve drafts and support browser history", async ({
  page,
}) => {
  await page.goto("/#account/profile");
  await page.getByLabel("Full name").fill("Alex Rivera");
  const nav = page.getByRole("navigation", { name: "Account sections" });
  await nav.getByRole("link", { name: "Security" }).click();
  await expect(
    page.getByRole("heading", { name: "Security", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Full name")).toHaveValue("Alex Rivera");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Example profile saved.")).toBeVisible();
  await nav.getByRole("link", { name: "API keys" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "API keys", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revoke", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Revoke key", exact: true }).click();
  await expect(
    page.getByText("Local development", { exact: true }),
  ).toHaveCount(0);
});
test("account sections fit mobile and expose accessible navigation", async ({
  page,
}) => {
  await page.goto("/#account/profile");
  await page.screenshot({
    path: "test-results/account-desktop.png",
    fullPage: true,
  });
  let audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("combobox", { name: "Account sections" }).click();
  await page.getByRole("option", { name: "Notifications" }).click();
  await expect(page).toHaveURL(/#account\/notifications$/);
  await page.getByRole("switch", { name: "Weekly summary" }).click();
  await expect(
    page.getByRole("switch", { name: "Weekly summary" }),
  ).not.toBeChecked();
  await page.getByRole("combobox", { name: "Account sections" }).click();
  await page.getByRole("option", { name: "Profile", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "test-results/account-mobile.png",
    fullPage: true,
  });
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});
