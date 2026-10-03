import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function basics(page: import("@playwright/test").Page) {
  await page.goto("/#pages/connection-wizard");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Source control");
  await page.getByLabel("Service URL").fill("https://api.example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
test("wizard tests auth, invalidates changes, and retains failed saves", async ({
  page,
}) => {
  await basics(page);
  await page
    .getByRole("button", {
      name: "Choose token secret: Select secret reference",
    })
    .click();
  await page
    .getByLabel("Secret scope", { exact: true })
    .selectOption("organization");
  await page
    .getByRole("button", { name: /Service token · organization/ })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const create = page.getByRole("button", {
    name: "Create connection",
    exact: true,
  });
  await expect(create).toHaveCount(0);
  await page
    .getByLabel("Connection test result", { exact: true })
    .selectOption("credentials");
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(
    page.getByText(
      "Credentials were rejected. Review your selected secret or sign-in method.",
    ),
  ).toBeVisible();
  await expect(create).toHaveCount(0);
  await page
    .getByLabel("Connection test result", { exact: true })
    .selectOption("success");
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(create).toBeEnabled();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("switch", { name: "Review changes" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(create).toHaveCount(0);
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(create).toBeEnabled();
  await page.getByLabel("Simulate save failure").check();
  await create.click();
  await expect(
    page.getByText(
      "Save failed. Your configuration and successful test are preserved. Try again.",
    ),
  ).toBeVisible();
  await page.getByLabel("Simulate save failure").uncheck();
  await create.click();
  await expect(
    page.getByRole("heading", { name: "Connection created", exact: true }),
  ).toBeVisible();
});
test("authentication methods require their own inputs", async ({ page }) => {
  await basics(page);
  await page.getByLabel("Authentication type").selectOption("password");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Enter a username.")).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill("demo-user");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Select a secret reference.")).toBeVisible();
  await page.getByLabel("Authentication type").selectOption("oauth");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Complete the simulated OAuth authorization."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate device code", exact: true }).click();
  await page.getByRole("button", { name: "Open authorization page" }).click();
  await page.getByRole("button", { name: "Authorize connector", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account connected" })).toBeVisible();
  await page.getByLabel("Authentication type").selectOption("anonymous");
  await expect(page.getByLabel("Username", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior", exact: true }),
  ).toBeVisible();
});
test("secret scope explorer restricts ancestors and fits mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/secrets");
  await page
    .getByRole("button", { name: "Choose a secret: Select secret reference" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("6 results");
  await expect(
    page.getByRole("option", { name: "Component", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Secret scope", { exact: true })
    .selectOption("project");
  await expect(page.getByRole("dialog")).toContainText("2 results");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/secret-selector-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Service token · project/ }).click();
  await page.getByLabel("Current context").selectOption("organization");
  await page
    .getByRole("button", { name: "Choose a secret: Select secret reference" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("4 results");
  await expect(
    page.getByRole("option", { name: "Project", exact: true }),
  ).toHaveCount(0);
});
test("wizard is accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await basics(page);
  await page.getByLabel("Authentication type").selectOption("managed");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/connection-wizard-mobile.png",
    fullPage: true,
  });
});
