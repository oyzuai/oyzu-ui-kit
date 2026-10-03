import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("appearance persists and follows system when selected", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/authorize/device");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByLabel("Appearance", { exact: true }).selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByLabel("Appearance", { exact: true })).toHaveValue(
    "light",
  );
  await page.getByLabel("Appearance", { exact: true }).selectOption("system");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
test("dark authorization and portal contrast", async ({ page }) => {
  await page.goto("/authorize/device");
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.goto("/#pages/connectors");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("dark page families retain readable contrast", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("oyzu-appearance", "dark"),
  );
  for (const route of [
    "/#main",
    "/#components",
    "/#account/profile",
    "/#pages/audit",
    "/#pages/connection-wizard",
  ]) {
    await page.goto(route);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
      route,
    ).toEqual([]);
  }
});
