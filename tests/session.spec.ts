import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("profile updates sidebar and logout/login handles retry and reload", async ({
  page,
}) => {
  await page.goto("/#account/profile");
  await page.getByLabel("Full name").fill("Alex Rivera");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page
    .getByRole("button", { name: "Account menu for Alex Rivera" })
    .click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out of this session" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Simulate a sign-in failure").check();
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Simulate a sign-in failure").uncheck();
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await page.getByRole("button", { name: "Engineering 3 projects" }).click();
  await page
    .getByRole("button", { name: "Checkout service Project", exact: true })
    .click();
  await expect(page.getByLabel("Full name")).toBeVisible();
});
test("mobile account menu and signed out screen fit and are accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#account/profile");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Account menu for Alex Morgan" })
    .click();
  await page.screenshot({ path: "test-results/account-menu-mobile.png" });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out of this session" }).click();
  await page.screenshot({ path: "test-results/login-mobile.png" });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});

test("canceling logout retains a profile draft", async ({ page }) => {
  await page.goto("/#account/profile");
  await page.getByLabel("Full name").fill("Unfinished name");
  await page
    .getByRole("button", { name: "Account menu for Alex Morgan" })
    .click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await page.getByRole("link", { name: "Stay signed in" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Unfinished name");
  await expect(
    page.getByRole("button", { name: "Save profile" }),
  ).toBeEnabled();
});

test("profile menu closes the mobile drawer on the current page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#account/profile");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Account menu for Alex Morgan" })
    .click();
  await page.getByRole("menuitem", { name: "Your profile" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByLabel("Full name")).toBeVisible();
});
