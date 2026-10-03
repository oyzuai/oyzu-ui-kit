import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function draft(page: import("@playwright/test").Page, elevated = false) {
  await page.goto("/#pages/access");
  await page
    .getByRole("button", { name: "Assign access", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search recipients").fill("Build automation");
  await dialog.getByRole("button", { name: /Build automation/ }).click();
  await dialog
    .getByLabel("Role", { exact: true })
    .selectOption(elevated ? "admin@2" : "reader@1");
  await dialog
    .getByLabel("Resource coverage", { exact: true })
    .selectOption("descendants@3");
  await expect(dialog.getByLabel("Assignment lifetime")).toHaveCount(0);
  await expect(dialog.getByLabel("Assignment progress")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Review assignment", exact: true })
    .click();
  return dialog;
}
test("standard assignment pins definitions and revokes explicitly", async ({
  page,
}) => {
  const dialog = await draft(page);
  await expect(
    dialog.getByText(/all current and future matches/).first(),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Activate access", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Access granted", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revoke assignment" }).click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(
    page.getByRole("dialog").getByText("Access revoked", { exact: true }),
  ).toBeVisible();
});
test("elevated assignment remains pending, simulated review can fail", async ({
  page,
}) => {
  const dialog = await draft(page, true);
  await dialog.getByRole("button", { name: "Submit for approval" }).click();
  await expect(
    page.getByRole("dialog").getByText("Awaiting review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Scope Administrator",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Independent review preview")).not.toBeVisible();
  await page.getByText("Prototype controls", { exact: true }).click();
  await page.getByLabel("Independent review preview").selectOption("failure");
  await page
    .getByRole("button", { name: "Simulate reviewer response" })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Activation failed", { exact: true }),
  ).toBeVisible();
});
test("mobile composer retains draft on cancelled dismissal and is accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/access");
  await page
    .getByRole("button", { name: "Assign access", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Review assignment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: /^Alex Morgan/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(
    dialog.getByRole("button", { name: /^Alex Morgan/ }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
});

test("review edits preserve the draft and change the resulting grant", async ({
  page,
}) => {
  const dialog = await draft(page, true);
  await dialog.getByRole("button", { name: "Edit assignment" }).click();
  await expect(dialog.getByLabel("Role", { exact: true })).toHaveValue(
    "admin@2",
  );
  await dialog.getByLabel("Role", { exact: true }).selectOption("reader@1");
  await expect(
    dialog.getByLabel("Resource coverage", { exact: true }),
  ).toHaveValue("descendants@3");
  await dialog
    .getByRole("button", { name: "Review assignment", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Activate access", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Access granted", { exact: true }),
  ).toBeVisible();
});
test("access explanations follow coverage and revocation across independent grants", async ({
  page,
}) => {
  await page.goto("/#pages/access");
  await page
    .getByRole("button", { name: "Explain access", exact: true })
    .click();
  let d = page.getByRole("dialog");
  await expect(d.getByText(/2 independent access paths/)).toBeVisible();
  await d.getByLabel("Where", { exact: true }).selectOption("child");
  await expect(d.getByText(/1 independent access path/)).toBeVisible();
  await expect(
    d.getByText("The selected resource is outside this assignment’s coverage."),
  ).toBeVisible();
  await d.getByLabel("Can do what").selectOption("admin");
  await expect(
    d.getByRole("heading", { name: "No matching active grant" }),
  ).toBeVisible();
  await d.getByLabel("Can do what").selectOption("read");
  await d.getByRole("button", { name: "View assignment" }).first().click();
  await page.getByRole("button", { name: "Revoke assignment" }).click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Explain access", exact: true })
    .click();
  d = page.getByRole("dialog");
  await expect(d.getByText(/1 independent access path/)).toBeVisible();
  await expect(
    d.getByText("Revoked: this assignment grants no active access."),
  ).toBeVisible();
  await d.getByLabel("Where", { exact: true }).selectOption("child");
  await expect(
    d.getByRole("heading", { name: "No matching active grant" }),
  ).toBeVisible();
});
test("access explanation fits mobile and has accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pages/access");
  await page
    .getByRole("button", { name: "Explain access", exact: true })
    .click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test('direct composer supports multiple recipients and ongoing assignments',async({page})=>{
 await page.goto('/#pages/access');await page.getByRole('button',{name:'Assign access',exact:true}).click();const d=page.getByRole('dialog');
 await d.getByLabel('Role',{exact:true}).selectOption('reader@1');await d.getByLabel('Resource coverage',{exact:true}).selectOption('current@1');
 await d.getByLabel('Search recipients').fill('Alex Morgan');await d.getByRole('button',{name:/Alex Morgan/}).click();await d.getByLabel('Search recipients').fill('Build automation');await d.getByRole('button',{name:/Build automation/}).click();
 await expect(d.getByText('2 selected',{exact:true})).toBeVisible();await expect(d.getByLabel('Assignment lifetime')).toHaveCount(0);await expect(d.getByLabel('Assignment progress')).toHaveCount(0);
 await d.getByRole('button',{name:'Review assignment',exact:true}).click();await expect(d.getByRole('heading',{name:'Scope Reader for 2 recipients'})).toBeVisible();await d.getByRole('button',{name:'Activate access',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('status').filter({hasText:'2 assignments activated.'})).toBeVisible();
 const rows=page.locator('.access-table tbody tr');await expect(rows.nth(0)).toContainText('Indefinite');await expect(rows.nth(1)).toContainText('Indefinite');await expect(rows.nth(0)).toContainText('Alex Morgan');await expect(rows.nth(1)).toContainText('Build automation');
});
