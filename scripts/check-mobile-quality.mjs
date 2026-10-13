import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const output = "artifacts/upgrade-20261013/mobile-quality";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const [name, base] of [
    ["before", process.env.BEFORE_URL ?? "https://aks-campus-3d.vercel.app"],
    ["after", process.env.BASE_URL ?? "http://127.0.0.1:4173"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`${base}/?diagnostics=1`);
    await page.waitForFunction(
      () => window.__aksDiagnostics?.().stage === "displayed",
      null,
      { timeout: 120000 },
    );
    await page.waitForFunction(
      () => window.__aksDiagnostics().globeTilesLoaded,
      null,
      { timeout: 40000 },
    );
    await page.screenshot({ path: `${output}/${name}-overview.png` });
    const ids = await page.evaluate(() =>
      window.__aksDiagnostics().models.map((model) => model.id),
    );
    await page
      .locator(".facility-list button")
      .nth(ids.indexOf("main"))
      .evaluate((button) => button.click());
    await page.waitForTimeout(3500);
    await page.waitForFunction(
      () => window.__aksDiagnostics().globeTilesLoaded,
      null,
      { timeout: 40000 },
    );
    await page.screenshot({ path: `${output}/${name}-main.png` });
    const resolution = await page
      .locator(".cesium-widget canvas")
      .evaluate((canvas) => ({
        cssWidth: canvas.clientWidth,
        cssHeight: canvas.clientHeight,
        width: canvas.width,
        height: canvas.height,
        devicePixelRatio,
      }));
    assert.deepEqual(errors, []);
    if (name === "after")
      assert(resolution.width >= resolution.cssWidth * 1.99);
    results.push({ name, base, resolution, errors });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
