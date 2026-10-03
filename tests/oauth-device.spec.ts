import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("connector device request denies, expires, cancels and approves", async ({
  page,
}) => {
  await page.goto("/#pages/oauth");
  await page
    .getByRole("button", { name: "Generate device code", exact: true })
    .click();
  const code = await page.locator(".device-code code").textContent();
  await page.getByRole("button", { name: "Open authorization page" }).click();
  await page.getByRole("button", { name: "Deny", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("denied");
  await page.getByRole("button", { name: "Generate new code" }).click();
  await expect(page.locator(".device-code code")).not.toHaveText(code!);
  await page.getByText("Preview controls", { exact: true }).click();
  await page.getByRole("button", { name: "Expire code now" }).click();
  await expect(page.getByRole("status")).toContainText("expired");
  await page.getByRole("button", { name: "Generate new code" }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByRole("status")).toContainText("cancelled");
  await page.getByRole("button", { name: "Generate new code" }).click();
  await page.getByRole("button", { name: "Open authorization page" }).click();
  await page
    .getByRole("button", { name: "Authorize connector", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account connected" }),
  ).toBeVisible();
});
test("Oyzu code validation, explicit consent and mobile accessibility", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/authorize/device");
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preview session expiry" }),
  ).toHaveCount(0);
  await page.getByLabel("Device code", { exact: true }).fill("BAD");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Code not found");
  await page.getByLabel("Device code", { exact: true }).fill("wdjb-mjht");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue with demo account" })
    .click();
  await expect(
    page.getByRole("button", { name: "Authorize device", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByLabel("I started this request").check();
  await page
    .getByRole("button", { name: "Authorize device", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Device authorized" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
});
test("wizard OAuth authorization gates continue", async ({ page }) => {
  await page.goto("/#pages/connectors/github");
  await page
    .getByLabel("Connection name", { exact: true })
    .fill("Repository access");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Authentication type").selectOption("oauth");
  await page
    .getByRole("button", { name: "Generate device code", exact: true })
    .click();
  await page.getByRole("button", { name: "Open authorization page" }).click();
  await page
    .getByRole("button", { name: "Authorize connector", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Require review before changes are applied."),
  ).toBeVisible();
});

test("standalone authorization ignores portal session and context", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("oyzu-demo-signed-out", "true");
    sessionStorage.setItem(
      "oyzu-last-context",
      JSON.stringify({
        organization: "Operations",
        project: "Internal services",
      }),
    );
  });
  await page.goto("/authorize/device");
  await expect(
    page.getByRole("heading", { name: "Authorize your device" }),
  ).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Device code", { exact: true })).toBeVisible();
});

test('segmented code supports typing, deletion and whole-code paste', async ({page}) => {
 await page.goto('/authorize/device');
 const input=page.getByLabel('Device code',{exact:true});
 await input.focus();await input.pressSequentially('wdjb');
 await expect(input).toHaveValue('WDJB');
 await input.press('Backspace');await expect(input).toHaveValue('WDJ');
 await input.fill('wdjb-mjht');await expect(input).toHaveValue('WDJBMJHT');
 await expect(page.locator('.code-slot.filled')).toHaveCount(8);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
