import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("membership review preserves independent access and records changes", async ({
  page,
}) => {
  await page.goto("/#pages/user-groups/readers");
  await page.getByRole("button", { name: "Manage members" }).click();
  const d = page.getByRole("dialog");
  await d.getByRole("checkbox", { name: /Alex Morgan/ }).uncheck();
  await d.getByRole("button", { name: "Review changes", exact: true }).click();
  await expect(
    d.getByText("Loses group permissions on 20 resources"),
  ).toBeVisible();
  await expect(
    d.getByText("Retains access on 1 resource through other assignments."),
  ).toBeVisible();
  await d.getByText("Prototype controls", { exact: true }).click();
  await d.getByLabel("Save outcome").selectOption("failure");
  await d
    .getByRole("button", { name: "Save membership changes", exact: true })
    .click();
  await expect(d.getByRole("alert")).toContainText("no membership changed");
  await d.getByLabel("Save outcome").selectOption("success");
  await d
    .getByRole("button", { name: "Save membership changes", exact: true })
    .click();
  await expect(d).toHaveCount(0);
  await expect(
    page.getByText("Membership updated: 0 added, 1 removed."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Activity/ }).click();
  await expect(
    page.getByText("Project readers: 0 added, 1 removed."),
  ).toBeVisible();
});
test("provider membership is read only and group assignment preselects recipient", async ({
  page,
}) => {
  await page.goto("/#pages/user-groups/team-1");
  await expect(
    page.getByRole("heading", {
      name: "Membership follows your identity provider",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Manage members" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Assign access →", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("complementary", { name: "Assignment preview" })
      .getByRole("heading", { name: "Commerce", exact: true }),
  ).toBeVisible();
});
test("mobile membership editing keeps filtered selections and supports discard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/user-groups/readers");
  await page.getByRole("button", { name: "Manage members" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Search account members").fill("Alex Morgan");
  await d.getByRole("checkbox", { name: /Alex Morgan/ }).uncheck();
  await page.keyboard.press("Escape");
  await d.getByRole("button", { name: "Keep editing" }).click();
  await expect(
    d.getByRole("checkbox", { name: /Alex Morgan/ }),
  ).not.toBeChecked();
  await d.getByRole("button", { name: "Review changes", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
});
