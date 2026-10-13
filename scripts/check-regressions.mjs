import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const output = "artifacts/upgrade-20261013/regression-check";
await mkdir(output, { recursive: true });
const base = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL ?? "chrome",
  headless: true,
});
const results = [];
try {
  const page = await browser.newPage({
      viewport: { width: 1500, height: 950 },
      reducedMotion: "reduce",
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${base}/?diagnostics=1`);
  await page.waitForFunction(
    () => window.__aksDiagnostics?.().stage === "displayed",
    null,
    { timeout: 120000 },
  );
  const ids = await page.evaluate(() =>
    window.__aksDiagnostics().models.map((m) => m.id),
  );
  for (let i = 0; i < ids.length; i++) {
    await page.locator(".facility-list button").nth(i).click();
    await page.waitForFunction(
      (id) => window.__aksDiagnostics().selectedTarget?.id === id,
      ids[i],
    );
    await page.waitForTimeout(850);
    const d = await page.evaluate(() => window.__aksDiagnostics()),
      model = d.models.find((m) => m.id === ids[i]);
    assert(model.ready && model.show);
    assert(Number.isFinite(d.camera.height));
    assert(await page.locator(".building-details img").isVisible());
    assert(
      await page
        .locator(".building-details img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    );
    results.push({
      facility: ids[i],
      selected: d.selectedTarget.id,
      screen: model.screenPosition,
      failures: d.failures,
    });
    if (
      [
        "main",
        "hall",
        "library",
        "hakuijeong",
        "jangseogak",
        "graduate-school",
        "boinjae",
      ].includes(ids[i])
    )
      await page.screenshot({ path: `${output}/${ids[i]}.png` });
  }
  await page
    .getByRole("checkbox", { name: "건물 모델", exact: true })
    .uncheck();
  await page.waitForTimeout(100);
  assert(
    (await page.evaluate(() => window.__aksDiagnostics())).models.every(
      (m) => !m.show,
    ),
  );
  await page.getByRole("checkbox", { name: "건물 모델", exact: true }).check();
  await page.getByRole("button", { name: "버스 보기", exact: true }).click();
  await page.waitForTimeout(200);
  assert((await page.evaluate(() => window.__aksDiagnostics())).life.following);
  await page
    .locator(".cesium-widget canvas")
    .click({ position: { x: 500, y: 460 } });
  assert.equal(
    (await page.evaluate(() => window.__aksDiagnostics())).life.following,
    undefined,
  );
  await page.getByRole("button", { name: /공식 안내도/ }).click();
  assert(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
  for (const scenario of [
    "missing-neighborhood-model",
    "missing-dataset",
    "reload-during-load",
  ]) {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 850 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    if (scenario === "missing-neighborhood-model")
      await page.route("**/models/blender/surroundings.glb", (route) =>
        route.fulfill({ status: 404, body: "missing test asset" }),
      );
    if (scenario === "missing-dataset")
      await page.route("**/data/surroundings.json", (route) =>
        route.fulfill({ status: 503, body: "test outage" }),
      );
    await page.goto(`${base}/?diagnostics=1`);
    if (scenario === "reload-during-load") {
      await page.waitForTimeout(250);
      await page.reload();
    }
    await page.waitForFunction(
      () => window.__aksDiagnostics?.().stage === "displayed",
      null,
      { timeout: 120000 },
    );
    const d = await page.evaluate(() => window.__aksDiagnostics());
    assert.equal(d.models.filter((m) => m.ready).length, 19);
    if (scenario === "missing-neighborhood-model") {
      assert.equal(d.life.surroundingSource, "procedural");
      assert.equal(d.life.surroundings, 156);
      assert(d.life.ready);
    }
    if (scenario === "missing-dataset") {
      assert.equal(d.life, undefined);
      assert(d.failures.some((f) => f.includes("campus-life")));
      assert(
        await page
          .getByRole("button", { name: "재생", exact: true })
          .isDisabled(),
      );
      assert(
        await page
          .getByText(
            "주변 건물·시뮬레이션을 불러오지 못했습니다. 새로고침해 다시 시도해 주세요.",
            { exact: true },
          )
          .isVisible(),
      );
    }
    assert.deepEqual(errors, []);
    results.push({
      scenario,
      modelCount: d.modelCount,
      failures: d.failures,
      errors,
    });
    await page.close();
    console.log(`${scenario} passed`);
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log("19 facility selections, controls, fallback and reload passed");
