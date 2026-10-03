import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("desktop groups, rail, persistence and history", async ({ page }) => {
  await page.goto("/#pages/access-library");
  const nav = page.getByRole("navigation", {
    name: "Primary navigation",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "People & access" }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Workspace", exact: true }).click();
  await expect(
    nav.getByRole("link", { name: "Projects", exact: true }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(
    nav.getByRole("link", { name: "Projects", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand sidebar", exact: true }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Components", exact: true }).click();
  await expect(page).toHaveURL(/#components$/);
  await page.goBack();
  await expect(
    nav.getByRole("link", { name: "People & access" }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({ path: "test-results/sidebar-rail.png" });
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(
    nav.getByRole("link", { name: "People & access" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/sidebar-desktop.png" });
});
test("mobile drawer dismissal, navigation, focus and resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/access-library");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  const nav = page.getByRole("navigation", {
    name: "Mobile primary navigation",
  });
  await nav.getByRole("button", { name: "Connections", exact: true }).click();
  await expect(page).toHaveURL(/#pages\/access-library$/);
  await page.screenshot({ path: "test-results/sidebar-mobile.png" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await nav.getByRole("link", { name: "Account settings" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("#main")).toBeFocused();
  await menu.click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Collapse sidebar", exact: true }),
  ).toBeFocused();
});
test("mobile navigation preserves drafts until discarded", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/connection");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Unsaved source");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const nav = page.getByRole("navigation", {
    name: "Mobile primary navigation",
  });
  await nav.getByRole("link", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await nav.getByRole("link", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Discard and leave" }).click();
  await expect(page).toHaveURL(/#pages\/resources$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});
