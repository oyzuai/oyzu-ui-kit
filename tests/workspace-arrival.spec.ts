import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("choose a project, then restore it on next login", async ({ page }) => {
  await page.goto("/#session/login");
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await page.getByRole("button", { name: "Operations 2 projects" }).click();
  await page
    .getByRole("button", { name: "Internal services Project", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Switch context: Operations / Internal services",
    }),
  ).toBeVisible();
  await page.goto("/#session/logout");
  await page.getByRole("button", { name: "Log out of this session" }).click();
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Switch context: Operations / Internal services",
    }),
  ).toBeVisible();
});
test("invitation failure, expired state, and acceptance on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#session/login");
  await page.getByLabel("After sign-in").selectOption("invitation");
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(
    page.getByText("Jordan Lee invited you to join Engineering."),
  ).toBeVisible();
  await page.getByLabel("Invitation preview").selectOption("expired");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await page.getByLabel("Invitation preview").selectOption("failure");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.getByRole("alert")).toContainText("Try again");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page.getByLabel("Invitation preview").selectOption("success");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    page.getByText("Engineering / Checkout service", { exact: true }),
  ).toBeVisible();
});
test("defer invitation and browse an empty organization", async ({ page }) => {
  await page.goto("/#session/login");
  await page.getByLabel("After sign-in").selectOption("invitation");
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await page.getByRole("button", { name: "Not now" }).click();
  await page.getByLabel("Find an organization").fill("missing");
  await expect(page.getByText("No matching organizations.")).toBeVisible();
  await page.getByLabel("Find an organization").fill("");
  await page.getByRole("button", { name: "Research 0 projects" }).click();
  await expect(
    page.getByText("No projects yet.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Organization overview Research" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Switch context: Research / Organization",
    }),
  ).toBeVisible();
});
