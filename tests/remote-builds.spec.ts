import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const remote = "/remote-builds.html";
const failedRun = `${remote}#pipeline-run-9012-attempt-2`;

test("phone Pipeline assistant is a modal dialog with trapped and restored focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(failedRun);
  const opener = page.getByRole("button", { name: "Ask Oyzu", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Ask Oyzu")).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((node) => node.contains(document.activeElement)),
    )
    .toBeTruthy();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      dialog.evaluate((node) => node.contains(document.activeElement)),
    )
    .toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .include(".pl-phone-assistant")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("clipboard rejection shows a selectable full link and never reports Copied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.goto(failedRun);
  await page.getByRole("button", { name: /Show full log/ }).click();
  const lineButton = page
    .getByRole("button", { name: /Copy link to line/ })
    .first();
  await expect(lineButton).toBeVisible();
  await lineButton.click();
  const status = page.locator(".lv-toast");
  await expect(status).toContainText(
    "Couldn’t copy. Select this link and copy it manually",
  );
  const link = page.getByRole("textbox", { name: "Log line link" });
  await expect(link).toHaveValue(
    /^http:\/\/127\.0\.0\.1:5174\/remote-builds\.html#pipeline-run-9012-attempt-2-L\d+$/,
  );
  await expect(status).not.toContainText("Copied");
  await link.focus();
  await expect
    .poll(() =>
      link.evaluate(
        (input: HTMLInputElement) =>
          input.selectionStart !== input.selectionEnd,
      ),
    )
    .toBeTruthy();
});

test("a copied line URL reopens the same run, attempt and selected line", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copiedText?: string }).copiedText = value;
        },
      },
    });
  });
  await page.goto(failedRun);
  await page.getByRole("button", { name: /Show full log/ }).click();
  const button = page
    .getByRole("button", { name: /Copy link to line/ })
    .first();
  const label = await button.getAttribute("aria-label");
  const seq = Number(label?.match(/(\d+)$/)?.[1]);
  await button.click();
  await expect(page.locator(".lv-toast")).toContainText("Copied link");
  const url = await page.evaluate(
    () => (window as Window & { copiedText?: string }).copiedText,
  );
  expect(url).toMatch(/#pipeline-run-9012-attempt-2-L\d+$/);
  await page.goto(url!);
  await expect(page).toHaveURL(
    new RegExp(`#pipeline-run-9012-attempt-2-L${seq}$`),
  );
  await expect(page.locator(`.lv-line[data-seq="${seq}"]`)).toHaveClass(
    /is-selected/,
  );
  await expect(page.locator(".pl-exec-head")).toContainText("#9012");
});

test("Suggest a fix shows the diff; opening it asks for confirmation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(failedRun);
  await page.getByRole("button", { name: "Ask Oyzu", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Message the assistant" });
  await composer.fill("Why did this fail?");
  await composer.press("Enter");

  await page
    .getByRole("article")
    .getByRole("button", { name: "Suggest a fix", exact: true })
    .click();
  await expect(
    page
      .getByRole("article")
      .getByText(/Keep the key from the first attempt and pass it through\./),
  ).toBeVisible();
  // The finished reply is announced once through the polite live region.
  await expect(page.locator('.as-messages [aria-live="polite"]')).toContainText(
    "Keep the key from the first attempt",
  );
  await expect(
    page.getByText("crates/payments-core/src/refund.rs", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Posted|Opened the proposed change/)).toHaveCount(
    0,
  );

  await page
    .getByRole("button", {
      name: "Open as suggested change on #482",
      exact: true,
    })
    .click();
  const confirmation = page
    .getByRole("group", { name: "Confirm action" })
    .last();
  await expect(confirmation).toContainText(
    "Open the proposed change as a suggested change on pull request #482?",
  );
  await expect(confirmation).toContainText(
    "Nothing will be sent until you confirm.",
  );
  await expect(
    page.getByText(
      "Opened the proposed change on pull request #482 for review.",
      { exact: true },
    ),
  ).toHaveCount(0);
});
