import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const output = "artifacts/upgrade-20261013/interaction-check";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL ?? "chrome",
  headless: true,
});
const base = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const results = [];
try {
  for (const profile of [
    { name: "desktop", viewport: { width: 1600, height: 1000 } },
    {
      name: "mobile",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    },
  ]) {
    const { name, ...options } = profile;
    const page = await browser.newPage(options),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const started = Date.now();
    await page.goto(`${base}/?diagnostics=1`);
    await page.waitForFunction(
      () => window.__aksDiagnostics?.().stage === "displayed",
      null,
      { timeout: 120000 },
    );
    const initial = await page.evaluate(() => window.__aksDiagnostics());
    assert.equal(initial.models.filter((m) => m.ready).length, 19);
    assert.equal(initial.life.surroundings, 156);
    assert.equal(initial.life.actors.length, 42);
    assert(initial.life.ready);
    const loadedMs = Date.now() - started;
    await page.screenshot({ path: `${output}/${name}-initial.png` });
    if (await page.getByRole("button", { name: "동작 설정 펼치기" }).count())
      await page.getByRole("button", { name: "동작 설정 펼치기" }).click();
    if (name === "mobile") assert.equal(initial.life.state.playing, false);
    if (initial.life.state.playing)
      await page.getByRole("button", { name: "일시정지", exact: true }).click();
    await page.waitForTimeout(2200);
    const pausedA = await page.evaluate(() => window.__aksDiagnostics());
    await page.waitForTimeout(1400);
    const pausedB = await page.evaluate(() => window.__aksDiagnostics());
    assert.equal(pausedA.life.elapsed, pausedB.life.elapsed);
    assert.deepEqual(
      pausedA.life.actors.map((a) => a.distance),
      pausedB.life.actors.map((a) => a.distance),
    );
    const idleFrames = pausedB.frames - pausedA.frames;
    await page.getByRole("checkbox", { name: "사람", exact: false }).uncheck();
    await page
      .getByRole("checkbox", { name: "버스·승용차", exact: false })
      .uncheck();
    await page
      .getByRole("checkbox", { name: "주변 건물", exact: true })
      .uncheck();
    await page.waitForTimeout(200);
    const hidden = await page.evaluate(() => window.__aksDiagnostics());
    assert(hidden.life.actors.every((a) => !a.show));
    assert.equal(hidden.life.surroundingVisible, false);
    await page
      .getByRole("button", { name: "산책길 보기", exact: true })
      .click();
    await page.waitForTimeout(1400);
    const walking = await page.evaluate(() => window.__aksDiagnostics());
    assert(walking.life.state.people);
    assert(
      walking.life.following?.includes("promenade") ||
        walking.life.following?.includes("hall"),
    );
    await page.getByRole("button", { name: "버스 보기", exact: true }).click();
    await page.waitForTimeout(1200);
    const bus = await page.evaluate(() => window.__aksDiagnostics());
    assert(bus.life.state.traffic);
    assert(bus.life.following?.includes("express"));
    await page.getByRole("button", { name: "주변 보기", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "주변 건물", exact: true })
      .check();
    await page
      .getByRole("button", { name: "캠퍼스 전체", exact: true })
      .click();
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${output}/${name}-overview.png` });
    await page.getByRole("button", { name: "재생", exact: true }).click();
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => window.__aksDiagnostics());
    await page.waitForTimeout(5000);
    const after = await page.evaluate(() => window.__aksDiagnostics());
    assert(after.life.elapsed > before.life.elapsed + 3);
    assert(
      after.life.actors
        .filter((a) => a.kind === "person")
        .every((a) => a.animationReady),
    );
    const approximateFps = (after.frames - before.frames) / 5;
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    results.push({
      name,
      loadedMs,
      idleFrames,
      approximateFps,
      errors,
      diagnostics: after,
    });
    console.log(
      JSON.stringify({ name, loadedMs, idleFrames, approximateFps, errors }),
    );
    await page.close();
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
