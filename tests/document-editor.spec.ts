import { test, expect } from "@playwright/test";
async function replaceCode(page: any, text: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(text);
}
test("wizard source roundtrip rejects invalid and unknown data and resets tests", async ({
  page,
}) => {
  await page.goto("/#pages/connectors/docker");
  await page.getByLabel("Connection name", { exact: true }).fill("Images");
  await page.getByRole("button", { name: "YAML", exact: true }).click();
  await expect(page.locator(".cm-content")).toContainText("name: Images");
  await replaceCode(page, "unknown: true");
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unsupported field");
  const data = {
    connector: "docker",
    name: "Release images",
    identifier: "release-images",
    endpoint: "https://hub.docker.com",
    authentication: "anonymous",
    username: "",
    secretReference: null,
    reviewChanges: true,
  };
  await replaceCode(page, JSON.stringify(data));
  await page.getByRole("button", { name: "YAML", exact: true }).click();
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveValue(
    "Release images",
  );
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create connection", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "YAML", exact: true }).click();
  await replaceCode(page, JSON.stringify({ ...data, name: "New name" }));
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Test connection", exact: true }),
  ).toBeEnabled();
});
test("saved edit locks identifier and presents changes", async ({ page }) => {
  await page.goto("/#pages/connection");
  await page.getByLabel("Connection name", { exact: true }).fill("Original");
  await page.getByLabel("Service URL").fill("https://api.example.com");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit connection", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "YAML", exact: true }).click();
  const doc = {
    name: "Changed",
    identifier: "changed",
    endpoint: "https://api.example.com",
    authentication: "managed",
    secretReference: "",
    reviewChanges: true,
    timeoutSeconds: "30",
  };
  await replaceCode(page, JSON.stringify(doc));
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("cannot change");
  await replaceCode(page, JSON.stringify({ ...doc, identifier: "original" }));
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await page.getByText("Review changes", { exact: true }).last().click();
  await expect(page.locator(".document-diff del")).toContainText("Original");
  await expect(page.locator(".document-diff ins")).toContainText("Changed");
});
