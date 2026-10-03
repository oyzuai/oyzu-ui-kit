import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("wizard step and draft survive expiry and account mismatch", async ({
  page,
}) => {
  await page.goto("/#pages/connection-wizard");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Preserved connection");
  await page.getByLabel("Service URL").fill("https://example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview session expiry" })
    .last()
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByText("Sign in to continue", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Session recovery preview").selectOption("different");
  await dialog
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(
    dialog.getByText("This draft belongs to another account"),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Sign in with original account" })
    .click();
  await dialog
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", {
      name: "Choose token secret: Select secret reference",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Preserved connection",
  );
});
test("raw YAML is preserved through revoked access and retry on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/connectors/docker");
  await page.getByRole("button", { name: "YAML", exact: true }).click();
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText("name: [unfinished");
  await page
    .getByRole("button", { name: "Preview session expiry" })
    .last()
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Session recovery preview").selectOption("denied");
  await dialog
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(dialog.getByText("Workspace access has changed")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog.getByRole("button", { name: "Try sign-in again" }).click();
  await dialog
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(dialog).toBeHidden();
  await expect(editor).toHaveText("name: [unfinished");
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
});

test("nested modal wizard remains open after recovery", async ({ page }) => {
  await page.goto("/#pages/connectors");
  await page.getByLabel("Wizard presentation").selectOption("modal");
  await page.getByRole("link", { name: /Docker Hub/ }).click();
  await page.getByLabel("Connection name", { exact: true }).fill("Modal draft");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Preview session expiry" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Modal draft",
  );
});
