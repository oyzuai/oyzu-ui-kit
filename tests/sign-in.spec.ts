import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("social provider cancellation, retry, and sign-in", async ({ page }) => {
  await page.goto("/#session/login");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel sign-in" }).click();
  await page.getByLabel("Provider response").selectOption("unavailable");
  await page
    .getByRole("button", { name: "Continue with GitHub", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete simulated sign-in" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Try again");
  await page.getByLabel("Provider response").selectOption("success");
  await page
    .getByRole("button", { name: "Complete simulated sign-in" })
    .click();
  await page.getByRole("button", { name: "Engineering 3 projects" }).click();
  await page
    .getByRole("button", { name: "Checkout service Project", exact: true })
    .click();
  await expect(page.getByLabel("Full name")).toBeVisible();
});
test("SSO discovery, access denial and expired requests", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#session/login");
  await page.getByRole("button", { name: "Sign in with SSO" }).click();
  await page.getByLabel("Work email").fill("alex@unknown.example");
  await page.getByRole("button", { name: "Continue to SSO" }).click();
  await expect(page.getByRole("alert")).toContainText("No SSO workspace");
  await page.getByLabel("Work email").fill("alex@example.com");
  await page.getByRole("button", { name: "Continue to SSO" }).click();
  await page.getByLabel("Provider response").selectOption("expired");
  await page
    .getByRole("button", { name: "Complete simulated sign-in" })
    .click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await page.getByRole("button", { name: "Start again", exact: true }).click();
  await page.getByRole("button", { name: "Sign in with SSO" }).click();
  await page.getByRole("button", { name: "Continue to SSO" }).click();
  await page.getByLabel("Provider response").selectOption("denied");
  await page
    .getByRole("button", { name: "Complete simulated sign-in" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Workspace access required" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "Use another account" }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
});
test("canceling a pending handoff cannot complete the session", async ({
  page,
}) => {
  await page.goto("/#session/login");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete simulated sign-in" })
    .click();
  await page.getByRole("button", { name: "Cancel sign-in" }).click();
  await page.waitForTimeout(900);
  await expect(
    page.getByRole("button", { name: "Sign in with SSO" }),
  ).toBeVisible();
});
