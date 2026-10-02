import { test, expect } from "@playwright/test";

test("saved workspace only enables save for changes and supports copying the immutable identifier", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Copy identifier" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("acme-studio");
  await expect(
    page.getByRole("button", { name: "Identifier copied" }),
  ).toBeVisible();
  await page.getByLabel("Workspace name", { exact: true }).fill("A new name");
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  await page.getByLabel("Workspace name", { exact: true }).fill("Acme Studio");
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("clipboard failure provides a manual fallback", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByRole("button", { name: "Copy identifier" }).click();
  await expect(
    page.getByText(
      "Couldn’t copy. Select the identifier and copy it manually.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "acme-studio",
  );
});

test("connection editing protects and retains a draft on failure and cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up a connection" }).click();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Production API");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByLabel("Save behavior").selectOption("fail");
  await page.getByRole("button", { name: "Edit Production API" }).click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await page.getByLabel("Connection name", { exact: true }).fill("New API");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("Your draft is safe");
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "New API",
  );
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "production-api",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "New API",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Production API" }),
  ).toBeVisible();
});
