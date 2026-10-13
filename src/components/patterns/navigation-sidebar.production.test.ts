import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chromium } from "@playwright/test";
import { build } from "vite";

test("optimized mobile drawer CSS stays in the viewport and preserves centered dialogs", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "oyzu-drawer-css-"));
  const browser = await chromium.launch();
  try {
    const drawerCss = await readFile(
      new URL("./navigation-sidebar.css", import.meta.url),
      "utf8",
    );
    // The generic Dialog's centering utilities use individual translate
    // properties. Compile the actual drawer stylesheet against that contract.
    const centeredDialogCss = `
      * { box-sizing: border-box; }
      .centered-dialog {
        position: fixed;
        top: 50%; left: 50%; width: 100px; height: 80px;
        --tw-translate-x: -50%; --tw-translate-y: -50%;
        translate: var(--tw-translate-x) var(--tw-translate-y);
      }
    `;
    const input = join(workspace, "drawer.css");
    await writeFile(input, centeredDialogCss + drawerCss);
    const result = await build({
      configFile: false,
      root: workspace,
      logLevel: "silent",
      build: {
        write: false,
        cssMinify: "lightningcss",
        rollupOptions: { input },
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    const asset = outputs
      .flatMap((output) => ("output" in output ? output.output : []))
      .find(
        (output) => output.type === "asset" && output.fileName.endsWith(".css"),
      );
    assert.ok(asset && asset.type === "asset", "compiled CSS asset exists");
    const optimizedCss =
      typeof asset.source === "string"
        ? asset.source
        : new TextDecoder().decode(asset.source);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      const page = await browser.newPage({ viewport });
      await page.setContent(`<style>${optimizedCss}</style>
        <div id="ordinary" class="centered-dialog" data-slot="dialog-content"></div>
        <div id="drawer" class="centered-dialog navigation-mobile-drawer" data-slot="dialog-content"></div>`);
      const geometry = await page.evaluate(() => {
        const drawer = document.getElementById("drawer")!;
        const ordinary = document.getElementById("ordinary")!;
        const d = drawer.getBoundingClientRect();
        const o = ordinary.getBoundingClientRect();
        return {
          drawer: { x: d.x, y: d.y, right: d.right, bottom: d.bottom },
          ordinary: { x: o.x, y: o.y },
          translation: getComputedStyle(drawer).translate,
        };
      });
      assert.equal(
        geometry.drawer.x,
        0,
        `${viewport.width}px drawer starts at left`,
      );
      assert.equal(
        geometry.drawer.y,
        0,
        `${viewport.width}px drawer starts at top`,
      );
      assert.ok(geometry.drawer.right <= viewport.width);
      assert.ok(geometry.drawer.bottom <= viewport.height);
      assert.equal(geometry.ordinary.x, (viewport.width - 100) / 2);
      assert.equal(geometry.ordinary.y, (viewport.height - 80) / 2);
      assert.doesNotMatch(geometry.translation, /-50%/);
      await page.close();
    }
  } finally {
    await browser.close();
    assert.ok(workspace.startsWith(join(tmpdir(), "oyzu-drawer-css-")));
    await rm(workspace, { recursive: true, force: true });
  }
});
