import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("draft save, publish, assign, migrate and audit stay connected", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await page.getByRole("button", { name: /^Roles/ }).click();
  await page.getByRole("button", { name: "Create role", exact: true }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Role name", { exact: true }).fill("Journey role");
  await d.getByRole("checkbox", { name: /read scope.read/ }).check();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await d.getByRole("button", { name: "Review role", exact: true }).click();
  await d.getByRole("button", { name: "Save role draft" }).click();
  await page.getByRole("button", { name: /Journey role/ }).click();
  await d.getByRole("button", { name: "Review role", exact: true }).click();
  await d.getByRole("button", { name: "Save role draft" }).click();
  await expect(page.getByRole("button", { name: /Journey role/ })).toHaveCount(
    1,
  );
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: /Journey role/ }) })
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish revision", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Access assignments →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Assign access", exact: true })
    .click();
  d = page.getByRole("dialog");
  await d.getByLabel("Search recipients").fill("Build automation");
  await d.getByRole("button", { name: /Build automation/ }).click();
  await d
    .getByLabel("Role", { exact: true })
    .selectOption({ label: "Journey role · v1" });
  await d
    .getByLabel("Resource coverage", { exact: true })
    .selectOption("current@1");
  await d
    .getByRole("button", { name: "Review assignment", exact: true })
    .click();
  await d.getByRole("button", { name: "Activate access", exact: true }).click();
  await expect(
    d.getByRole("heading", { name: "Access granted", exact: true }),
  ).toBeVisible();
  await d.getByRole("link", { name: "View definitions →" }).click();
  await page.getByRole("button", { name: /^Roles/ }).click();
  await page.getByRole("button", { name: /Journey role/ }).click();
  d = page.getByRole("dialog");
  await d.getByRole("checkbox", { name: /update scope.update/ }).check();
  await d.getByRole("button", { name: "Review role", exact: true }).click();
  await d.getByRole("button", { name: "Save role draft" }).click();
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: /Journey role/ }) })
    .filter({ hasText: "Draft" })
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await expect(
    d.getByText("1 existing assignments stay unchanged"),
  ).toBeVisible();
  await d
    .getByRole("button", { name: "Publish revision", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Access assignments →", exact: true })
    .click();
  await page.getByRole("button", { name: /Build automation.*access-/ }).click();
  d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Change pinned revisions" }).click();
  await d
    .getByLabel("Role revision")
    .selectOption({ label: "Journey role · v2" });
  await expect(d.getByText("1 permissions added · 0 removed")).toBeVisible();
  await d.getByRole("button", { name: "Request revision change" }).click();
  await expect(
    d.getByRole("heading", { name: "Awaiting review" }),
  ).toBeVisible();
  await d.getByLabel("Reviewer", { exact: true }).selectOption("self");
  await expect(
    d.getByRole("button", { name: "Approve request" }),
  ).toBeDisabled();
  await d.getByLabel("Reviewer", { exact: true }).selectOption("success");
  await d.getByRole("button", { name: "Approve request" }).click();
  await expect(
    d.getByRole("heading", { name: "Access granted", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Build automation" })
      .filter({ hasText: "Revoked" }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Audit trail", exact: true }).click();
  await expect(page.getByText("Revision published").first()).toBeVisible();
  await expect(page.getByText("Assignment revoked").first()).toBeVisible();
});
test("mixed coverage, dirty protection and shared membership suppression", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await page.getByRole("button", { name: /^Resource groups/ }).click();
  await page.getByRole("button", { name: "Create resource group" }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Resource group name").fill("Mixed coverage");
  await d.getByLabel("Include descendants").check();
  await d.getByLabel("project selection", { exact: true }).selectOption("all");
  await d
    .getByLabel("component selection", { exact: true })
    .selectOption("exact");
  await d.locator(".al-resource-options input").first().check();
  await d.locator(".al-resource-options input").nth(1).check();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await d.getByRole("button", { name: "Review coverage" }).click();
  await expect(
    d.getByText("project: All current and future matches"),
  ).toBeVisible();
  await expect(
    d.getByText("component: 2 specific resources; future resources excluded"),
  ).toBeVisible();
  await d.getByRole("button", { name: "Save resource group draft" }).click();
  await page.getByRole("button", { name: /^Users/ }).click();
  await page.getByRole("button", { name: /Alex Morgan.*example.com/ }).click();
  await d.getByText("Prototype controls", { exact: true }).click();
  await d.getByRole("button", { name: "Suspend membership" }).click();
  await expect(d.getByText(/Membership is suspended/)).toBeVisible();
  await d.getByRole("link", { name: "Assign or explain access →" }).click();
  await page
    .getByRole("button", { name: "Explain access", exact: true })
    .click();
  await expect(
    d.getByRole("heading", { name: "No matching active grant" }),
  ).toBeVisible();
  await expect(
    d.getByText("Membership is suspended; access is suppressed.").first(),
  ).toBeVisible();
  await d.getByText("Prototype controls", { exact: true }).click();
  await d.getByLabel("Evaluation state").selectOption("unavailable");
  await expect(
    d.getByRole("heading", { name: "Unable to determine access" }),
  ).toBeVisible();
});
test("coverage editor and publication review are accessible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/access-library");
  await page.getByRole("button", { name: /^Resource groups/ }).click();
  await page.getByRole("button", { name: "Create resource group" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("declined and failed migrations preserve the original grant; expiration is explained", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await page.getByRole("button", { name: /^Resource groups/ }).click();
  await page.getByRole("button", { name: /^Current scope/ }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Include descendants").check();
  await d.getByLabel("project selection", { exact: true }).selectOption("all");
  await d
    .getByLabel("component selection", { exact: true })
    .selectOption("all");
  await d.getByRole("button", { name: "Review coverage" }).click();
  await d.getByRole("button", { name: "Save resource group draft" }).click();
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: /^Current scope/ }) })
    .filter({ hasText: "Draft" })
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await d
    .getByRole("button", { name: "Publish revision", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Access assignments →", exact: true })
    .click();
  await page.getByRole("button", { name: /Alex Morgan.*access-002/ }).click();
  async function request() {
    await d.getByRole("button", { name: "Change pinned revisions" }).click();
    await d
      .getByLabel("Coverage revision")
      .selectOption({ label: "Current scope · v2" });
    await d.getByRole("button", { name: "Request revision change" }).click();
  }
  await request();
  await d.getByRole("button", { name: "Decline request" }).click();
  await expect(
    d.getByRole("heading", { name: "Request declined" }),
  ).toBeVisible();
  await d.getByRole("button", { name: "View original assignment" }).click();
  await expect(
    d.getByRole("heading", { name: "Access granted", exact: true }),
  ).toBeVisible();
  await request();
  await d.getByLabel("Reviewer", { exact: true }).selectOption("failure");
  await d.getByRole("button", { name: "Approve request" }).click();
  await expect(
    d.getByRole("heading", { name: "Activation failed", exact: true }),
  ).toBeVisible();
  await d.getByRole("button", { name: "View original assignment" }).click();
  await expect(
    d.getByRole("heading", { name: "Access granted", exact: true }),
  ).toBeVisible();
  await d.getByText("Prototype controls", { exact: true }).click();
  await d.getByRole("button", { name: "Simulate expiration" }).click();
  await expect(
    d.getByRole("heading", { name: "Access expired" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Explain access", exact: true })
    .click();
  await expect(
    d.getByText("Expired: this assignment grants no active access."),
  ).toBeVisible();
  await expect(d.getByText(/1 independent access path/)).toBeVisible();
});
