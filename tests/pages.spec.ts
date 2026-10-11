import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("page studies use the available width and handle sparse content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/#pages/resources");
  const bounds = await page.locator(".full-page").boundingBox();
  expect(bounds!.width).toBeGreaterThan(1400);
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/pages-wide.png",
    fullPage: true,
  });
  await page.getByLabel("Example content").selectOption("empty");
  await expect(
    page.getByRole("heading", { name: "Your first project starts here" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore sample projects" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.getByRole("link", { name: "Customer experience" }).click();
  await expect(
    page.getByRole("heading", { name: "Customer experience", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Customer experience", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All projects" }).click();
  await page.getByPlaceholder("Find a project…").fill("no such project");
  await expect(
    page.getByRole("heading", { name: "No projects match your search" }),
  ).toBeVisible();
});
test("full pages are accessible and responsive", async ({ page }) => {
  await page.goto("/#pages/resources");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    for (const [section, label] of [["resources", "Resource list"], ["detail", "Detail page"], ["activity", "Activity"]]) {
      if (section !== "resources" || width !== 1440) {
        await page.getByRole("navigation", { name: "Page examples" }).getByRole("link", { name: label, exact: true }).click();
      }
      await expect(page.locator(".full-page")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBeTruthy();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      await page.screenshot({
        path: `test-results/page-${section}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page
    .getByRole("button", { name: /Connection added Sam Rivera/ })
    .click();
  await expect(page.locator(".full-page-rail")).toContainText(
    "Added a read-only connection",
  );
  await page.getByPlaceholder("Search activity…").fill("missing");
  await expect(
    page.getByRole("heading", { name: "No matching activity" }),
  ).toBeVisible();
});

test('explicit unknown project IDs show not-found; omitting an ID uses the default project', async ({ page }) => {
  await page.goto('/#pages/detail/deleted-project-id');
  await expect(page.getByRole('heading',{name:'Project not found'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('This project could not be found.');
  await page.goto('/#pages/detail');
  await expect(page.getByRole('heading',{name:'Developer tools',exact:true})).toBeVisible();
});
