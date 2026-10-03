import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("row actions keep name links distinct and preserve list context", async ({
  page,
}) => {
  await page.goto("/#pages/resources");
  await page.getByPlaceholder("Find a project…").fill("Developer");
  const link = page.getByRole("link", { name: "Developer tools", exact: true });
  await expect(link).toHaveAttribute("href", "#pages/detail/developer-tools");
  await expect(link).not.toContainText("developer-tools");
  const quick = page.getByRole("button", {
    name: "Quick view Developer tools",
  });
  await quick.click();
  await expect(page.getByRole("dialog")).toContainText("developer-tools");
  await page.keyboard.press("Escape");
  await expect(quick).toBeFocused();
  await expect(page.getByPlaceholder("Find a project…")).toHaveValue(
    "Developer",
  );
  const actions = page.getByRole("button", {
    name: "Actions for Developer tools",
  });
  await actions.click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page.getByLabel("Project name").fill("Developer platform");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Actions for Developer platform" }),
  ).toBeFocused();
  await expect(page.locator("tbody")).toContainText("developer-tools");
  await page
    .getByRole("button", { name: "Actions for Developer platform" })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Delete Developer platform?",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Developer platform");
  await page
    .getByRole("button", { name: "Actions for Developer platform" })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByPlaceholder("Find a project…")).toBeFocused();
  await expect(page.locator("tbody")).toHaveCount(0);
});
test("quick view fills the phone and passes accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/resources");
  await page
    .getByRole("button", { name: "Quick view Developer tools" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.width).toBe(390);
  expect(box!.height).toBe(844);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/drawer-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open project page" }).click();
  await expect(
    page.getByRole("heading", { name: "Developer tools", exact: true }),
  ).toBeVisible();
});
