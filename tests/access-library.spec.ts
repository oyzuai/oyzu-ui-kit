import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("directory filters and paginates fictional account members", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await expect(page.getByText("Showing 1–16 of 96")).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Showing 17–32 of 96")).toBeVisible();
  await page.getByLabel("Search users").fill("Alex Morgan");
  await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();
  await page.getByRole("button", { name: /Alex Morgan.*example.com/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Direct assignment", { exact: false })
      .first(),
  ).toBeVisible();
});
test("role search preserves selection and draft review is explicit", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await page.getByRole("button", { name: /^Roles/ }).click();
  await page.getByRole("button", { name: "Create role", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Review role", exact: true }).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await d.getByLabel("Role name", { exact: true }).fill("Release observers");
  await d.getByLabel("Search permissions").fill("audit");
  await d.getByRole("checkbox", { name: /read audit.read/ }).check();
  await d.getByLabel("Search permissions").fill("scope");
  await d.getByRole("checkbox", { name: /read scope.read/ }).check();
  await d.getByRole("button", { name: "Review role", exact: true }).click();
  await expect(d.getByText("audit.read", { exact: true })).toBeVisible();
  await d.getByRole("button", { name: "Save role draft" }).click();
  await expect(
    page.getByRole("button", { name: /Release observers/ }),
  ).toBeVisible();
});
test("resource selectors validate exact selections and save a draft", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await page.getByRole("button", { name: /^Resource groups/ }).click();
  await page.getByRole("button", { name: "Create resource group" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Resource group name").fill("Engineering services");
  await d.getByLabel("Include descendants").check();
  await d.getByLabel("project selection", { exact: true }).selectOption("all");
  await d
    .getByLabel("component selection", { exact: true })
    .selectOption("exact");
  await d.getByRole("button", { name: "Review coverage" }).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await d.locator(".al-resource-options input").first().check();
  await d.getByRole("button", { name: "Add another scope" }).click();
  await d.getByLabel("Scope", { exact: true }).selectOption("Commerce");
  await d
    .getByLabel("organization selection", { exact: true })
    .selectOption("all");
  await d.getByRole("button", { name: "Review coverage" }).click();
  await expect(d.getByText(/2 scopes/)).toBeVisible();
  await d.getByRole("button", { name: "Save resource group draft" }).click();
  await expect(
    page.getByRole("button", { name: /Engineering services/ }),
  ).toBeVisible();
});
test("dense directory and role editor fit a phone and remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/access-library");
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: /^Roles/ }).click();
  await page.getByRole("button", { name: "Create role", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("member tabs expose assignment provenance and membership source", async ({
  page,
}) => {
  await page.goto("/#pages/access-library");
  await page.locator(".al-table tbody button").nth(0).click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByText(/Direct assignmentAssigned to this member/),
  ).toBeVisible();
  await expect(d.getByText("Through user group").first()).toBeVisible();
  await d.getByRole("button", { name: /Group memberships/ }).click();
  await expect(
    d.getByText("Managed by example identity provider").first(),
  ).toBeVisible();
  await d.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(
    d.getByText("No membership changes in this preview session.", {
      exact: true,
    }),
  ).toBeVisible();
});
