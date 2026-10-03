import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("modal protects drafts, restores focus and completes tested setup", async ({
  page,
}) => {
  await page.goto("/#pages/connectors");
  await page.getByLabel("Wizard presentation").selectOption("modal");
  const tile = page.getByRole("link", { name: /Docker Hub/ });
  await tile.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByLabel("Connection name", { exact: true }).fill("Images");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Images",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard setup" }).click();
  await expect(dialog).toBeHidden();
  await expect(tile).toBeFocused();
  await tile.click();
  await page.getByLabel("Connection name", { exact: true }).fill("Images");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Authentication type").selectOption("anonymous");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create connection", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(page.getByText("Connection verified", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).toBeHidden();
});
test("modal fits mobile and passes accessibility", async ({ page }) => {
  await page.goto("/#pages/connectors");
  await page.getByLabel("Wizard presentation").selectOption("modal");
  await page.getByRole("link", { name: /Terraform Cloud/ }).click();
  await page.screenshot({ path: "test-results/modal-wizard-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/modal-wizard-mobile.png" });
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
