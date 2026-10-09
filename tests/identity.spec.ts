import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
async function create(page: Page, name: string) {
  await page
    .getByRole("button", { name: /Set up a connection|Add another connection/ })
    .click();
  await page.getByLabel("Connection name", { exact: true }).fill(name);
}
async function finish(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("generated identifier follows the name until customized and can resume generation", async ({
  page,
}) => {
  await create(page, "Production API");
  await expect(page.getByLabel("Generated identifier")).toHaveText(
    "production-api",
  );
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("prod-api");
  await page.getByLabel("Connection name", { exact: true }).fill("Renamed API");
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "prod-api",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "prod-api",
  );
  await page.getByRole("button", { name: "Generate from name" }).click();
  await expect(page.getByLabel("Generated identifier")).toHaveText(
    "renamed-api",
  );
  await finish(page);
  await expect(page.locator(".connected code")).toHaveText("renamed-api");
});

test("custom identifier is locked after creation while friendly name can change", async ({
  page,
}) => {
  await create(page, "Production API");
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("prod-api");
  await finish(page);
  await page.getByRole("button", { name: "Edit Production API" }).click();
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Customer API");
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "prod-api",
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".connected h3")).toHaveText("Customer API");
  await expect(page.locator(".connected code")).toHaveText("prod-api");
});

test("duplicate ID is blocked, with an explicit alternative; duplicate names are allowed", async ({
  page,
}) => {
  await create(page, "Production API");
  await finish(page);
  await create(page, "Production API");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Name your connection" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("already used");
  await page.getByRole("button", { name: "Use production-api-2" }).click();
  await finish(page);
  await expect(page.locator(".connected code")).toHaveText([
    "production-api",
    "production-api-2",
  ]);
});

test("invalid manual IDs and names that produce empty IDs cannot advance", async ({
  page,
}) => {
  await create(page, "東京");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Enter an identifier");
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("Bad / ID");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("lowercase");
  await expect(
    page.getByRole("heading", { name: "Name your connection" }),
  ).toBeVisible();
  await page.getByLabel("Identifier", { exact: true }).fill("tokyo");
  await finish(page);
});

test("failed creation preserves custom identity and leaves it editable", async ({
  page,
}) => {
  await page.getByLabel("Save behavior").selectOption("fail");
  await create(page, "My API");
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("custom-api");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("custom-api");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(page.getByRole("alert")).toContainText("Your draft is safe");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "custom-api",
  );
  await expect(page.getByLabel("Identifier", { exact: true })).toBeEditable();
});

test("saved workspace identifier stays fixed on rename", async ({ page }) => {
  await page.getByRole("button", { name: "Edit details" }).click();
  await page
    .getByLabel("Workspace name", { exact: true })
    .fill("Different Studio");
  await expect(page.getByLabel("Identifier", { exact: true })).toHaveValue(
    "acme-studio",
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".details-grid code")).toHaveText("acme-studio");
});

test("inline editing confirms, cancels and does not submit the wizard", async ({
  page,
}) => {
  await create(page, "Production API");
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("temporary");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Generated identifier")).toHaveText(
    "production-api",
  );
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("prod-api");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Custom identifier")).toHaveText("prod-api");
  await expect(
    page.getByRole("heading", { name: "Name your connection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit identifier" }).click();
  await page.getByLabel("Identifier", { exact: true }).fill("changed");
  await page.getByRole("button", { name: "Cancel identifier edit" }).click();
  await expect(page.getByLabel("Custom identifier")).toHaveText("prod-api");
});
