import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function menu(
  page: import("@playwright/test").Page,
  name: string,
  action: string,
) {
  await page.getByRole("button", { name: "Actions for " + name }).click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/#pages/members");
});
test("member filters and scope drawer describe active and pending access", async ({
  page,
}) => {
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page
    .getByPlaceholder("Search name, email or identifier…")
    .fill("sam@example");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByPlaceholder("Search name, email or identifier…").fill("");
  await page.getByLabel("Filter by role").selectOption("Reader");
  await expect(page.locator("tbody")).toContainText("Jamie Chen");
  await page.getByLabel("Filter by status").selectOption("Pending");
  await expect(
    page.getByRole("heading", { name: "No matching members" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("button", { name: "View access for Alex Morgan" })
    .click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Separate account assignment");
  for (const scope of ["Account", "Organization", "Project", "Component"])
    await expect(drawer.getByText(scope, { exact: true })).toBeVisible();
  await expect(drawer).toContainText("Inherited from Engineering");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "View access for Alex Morgan" }),
  ).toBeFocused();
  await menu(page, "Taylor Reed", "View access");
  await expect(drawer).toContainText(
    "No organization access is active until the invitation is accepted.",
  );
});
test("invite validation, multi-address review, failure retry and duplicate prevention", async ({
  page,
}) => {
  await page.getByLabel("Action behavior").selectOption("fail");
  await page
    .getByRole("button", { name: "Invite people", exact: true })
    .click();
  await page.getByLabel("Email addresses").fill("bad-address");
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Check these email addresses",
  );
  await page.getByLabel("Email addresses").fill("alex@example.com");
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Already a member or invited",
  );
  await page
    .getByLabel("Email addresses")
    .fill("new@example.com, NEW@example.com");
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Remove duplicate");
  await page
    .getByLabel("Email addresses")
    .fill("new@example.com\nsecond@example.com");
  await page.getByLabel("Invitation role").selectOption("Contributor");
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("2 invitations");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Email addresses")).toHaveValue(
    "new@example.com\nsecond@example.com",
  );
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await page.getByRole("button", { name: "Create invitations" }).click();
  await expect(page.getByRole("alert")).toContainText("Nothing changed");
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByRole("button", { name: "Create invitations" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Invite people", exact: true })
    .click();
  await page.getByLabel("Email addresses").fill("third@example.com");
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await page.getByRole("button", { name: "Create invitations" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(7);
});
test("role changes preview impact and retry without losing input", async ({
  page,
}) => {
  await page.getByLabel("Action behavior").selectOption("fail");
  await menu(page, "Sam Rivera", "Change role");
  await page.getByLabel("New role").selectOption("Administrator");
  await expect(page.getByRole("dialog")).toContainText(
    "Contributor → Administrator",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Account access stays unchanged",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "inherited access changes to Administrator",
  );
  await page.getByRole("button", { name: "Save role" }).click();
  await expect(page.getByRole("alert")).toContainText("Nothing changed");
  await expect(page.getByLabel("New role")).toHaveValue("Administrator");
  await page.getByRole("button", { name: "Save role" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.locator("tbody tr").filter({ hasText: "sam@example.com" }),
  ).toContainText("Administrator");
  await expect(
    page.getByRole("button", { name: "Actions for Sam Rivera" }),
  ).toBeFocused();
});
test("resend, revoke and removal require confirmation and preserve state on failure", async ({
  page,
}) => {
  await menu(page, "Taylor Reed", "Resend invitation");
  await page
    .getByRole("button", { name: "Resend invitation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("tbody")).toContainText("Resent 1 time");
  await page.getByLabel("Action behavior").selectOption("fail");
  await menu(page, "Taylor Reed", "Revoke invitation");
  await page
    .getByRole("button", { name: "Revoke invitation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Nothing changed");
  await expect(page.locator("tbody")).toContainText("Taylor Reed");
  await page
    .getByRole("button", { name: "Revoke invitation", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.locator("tbody")).not.toContainText("Taylor Reed");
  await menu(page, "Jamie Chen", "Remove member");
  await expect(page.getByRole("alertdialog")).toContainText("inherited access");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Jamie Chen");
  await menu(page, "Jamie Chen", "Remove member");
  await page
    .getByRole("button", { name: "Remove member", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Organization members", exact: true }),
  ).toBeFocused();
  await expect(page.locator("tbody")).not.toContainText("Jamie Chen");
});
test("pending invite submission prevents duplicate saves and dismissal", async ({
  page,
}) => {
  await page.getByLabel("Action behavior").selectOption("slow");
  await page
    .getByRole("button", { name: "Invite people", exact: true })
    .click();
  await page.getByLabel("Email addresses").fill("slow@example.com");
  await page
    .getByRole("button", { name: "Review invitations", exact: true })
    .click();
  await page.getByRole("button", { name: "Create invitations" }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.locator("tbody tr").filter({ hasText: "slow@example.com" }),
  ).toHaveCount(1);
});
test("members and drawer fit mobile with accessible controls", async ({
  page,
}) => {
  const audit = async () => {
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  };
  await audit();
  await page.screenshot({
    path: "test-results/members-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await audit();
  await page.screenshot({
    path: "test-results/members-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "View access for Alex Morgan" })
    .click();
  await audit();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.width).toBe(390);
  await page.screenshot({
    path: "test-results/member-drawer-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Invite people", exact: true })
    .click();
  await audit();
});
