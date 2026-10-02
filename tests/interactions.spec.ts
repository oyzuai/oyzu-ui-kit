import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("edit validates, saves, and restores focus", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Edit details" });
  await trigger.click();
  await page.getByLabel("Workspace name", { exact: true }).fill("");
  await page.getByLabel("Contact email", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Use at least 2 characters.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Workspace name", { exact: true }).fill("New Studio");
  await page
    .getByLabel("Contact email", { exact: true })
    .fill("hello@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("status")).toContainText(
    "Workspace details updated.",
  );
  await expect(
    page.getByText("hello@example.com", { exact: true }),
  ).toBeVisible();
  await expect(trigger).toBeFocused();
});

test("escape protects edits and discard leaves saved values unchanged", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Workspace name", { exact: true }).fill("Unsaved");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Discard your changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Workspace name", { exact: true })).toHaveValue(
    "Unsaved",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByLabel("Workspace name", { exact: true })).toHaveValue(
    "Acme Studio",
  );
});

test("failed saves preserve draft and allow retry", async ({ page }) => {
  await page.getByLabel("Save behavior").selectOption("fail");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page
    .getByLabel("Workspace name", { exact: true })
    .fill("Keep this draft");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("Your draft is safe");
  await expect(page.getByLabel("Workspace name", { exact: true })).toHaveValue(
    "Keep this draft",
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("Your draft is safe");
});

test("slow saves prevent duplicates and dismissal", async ({ page }) => {
  await page.getByLabel("Save behavior").selectOption("slow");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Workspace name", { exact: true }).fill("Slow Studio");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(
    page.getByLabel("Workspace name", { exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 6000 });
});

test("wizard validates, preserves values on back, and creates after review", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Set up a connection" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "at least 2 characters" }),
  ).toBeVisible();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Design tools");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Apply automatically/ }).check();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Design tools",
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("radio", { name: /Apply automatically/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("Design tools");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Design tools" }),
  ).toBeVisible();
});

test("wizard failure preserves review and selections", async ({ page }) => {
  await page.getByLabel("Save behavior").selectOption("fail");
  await page.getByRole("button", { name: "Set up a connection" }).click();
  await page.getByLabel("Connection name", { exact: true }).fill("Test tools");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page.getByRole("alert")).toContainText("Your draft is safe");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Review before applying/ }),
  ).toBeChecked();
});

test("mobile layout fits and dialog stays usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBeTruthy();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeInViewport();
  await page.screenshot({
    path: "test-results/mobile-dialog.png",
    fullPage: true,
  });
});

test("capture desktop playground", async ({ page }) => {
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});
import AxeBuilder from "@axe-core/playwright";
test("settings and dialogs have no automated accessibility violations", async ({
  page,
}) => {
  const audit = async () => {
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  };
  await audit();
  await page.getByRole("button", { name: "Edit details" }).click();
  await audit();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Set up a connection" }).click();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Design tools");
  await page.getByRole("button", { name: "Continue" }).click();
  await audit();
});
