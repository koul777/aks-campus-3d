import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const base = process.env.BASE_URL ?? "https://aks-campus-3d.vercel.app";
const output = "artifacts/upgrade-20261013/deployment";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = {
  base,
  checkedAt: new Date().toISOString(),
  assets: [],
  pages: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1500, height: 950 },
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
  const initial = await page.evaluate(() => window.__aksDiagnostics());
  assert.equal(initial.modelCount, 19);
  assert(initial.models.every((model) => model.ready));
  assert.equal(initial.life.surroundings, 156);
  assert.equal(initial.life.actors.length, 42);
  assert.equal(initial.life.surroundingSource, "Blender");
  assert(initial.life.ready);
  assert.equal(initial.life.roadSurfaces.length, 2);
  assert(initial.life.roadsReady);
  assert.deepEqual(initial.failures, []);
  // Verify served binaries against this checkout, including all Draco assets.
  for (const folder of ["blender", "campus", "moving"]) {
    const manifest = JSON.parse(
      await readFile(`public/models/${folder}/manifest.json`, "utf8"),
    );
    for (const entry of manifest.models ?? manifest.assets) {
      const url = entry.url ?? `/models/${folder}/${entry.id}.glb`;
      const response = await page.request.get(`${base}${url}`);
      assert(response.ok(), url);
      const sha256 = createHash("sha256")
        .update(await response.body())
        .digest("hex");
      assert.equal(
        sha256,
        entry.outputSha256 ?? entry.sha256,
        `${url} does not match local build`,
      );
      results.assets.push({ url, sha256 });
    }
  }
  for (const [name, image] of [
    ["주변 보기", "neighborhood"],
    ["산책길 보기", "walkers"],
    ["버스 보기", "bus"],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForTimeout(1700);
    await page.waitForFunction(
      () => window.__aksDiagnostics().globeTilesLoaded,
      null,
      { timeout: 30000 },
    );
    await page.screenshot({ path: `${output}/${image}.png` });
  }
  await page.getByRole("button", { name: "재생", exact: true }).click();
  const before = await page.evaluate(
    () => window.__aksDiagnostics().life.elapsed,
  );
  await page.waitForTimeout(2000);
  assert(
    (await page.evaluate(() => window.__aksDiagnostics().life.elapsed)) >
      before + 1,
  );
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  const paused = await page.evaluate(
    () => window.__aksDiagnostics().life.elapsed,
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => window.__aksDiagnostics().life.elapsed),
    paused,
  );
  assert.deepEqual(errors, []);
  results.pages.push({
    name: "desktop",
    models: initial.modelCount,
    surroundings: initial.life.surroundings,
    actors: initial.life.actors.length,
    source: initial.life.surroundingSource,
    errors,
  });
  await page.close();

  // Small-screen failures must expand the otherwise collapsed controls.
  const mobile = await browser.newPage({
    viewport: { width: 320, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
  });
  const mobileErrors = [];
  mobile.on("pageerror", (error) => mobileErrors.push(String(error)));
  await mobile.route("**/data/surroundings.json", (route) =>
    route.fulfill({ status: 503, body: "test outage" }),
  );
  await mobile.goto(`${base}/?diagnostics=1`);
  await mobile.waitForFunction(
    () => window.__aksDiagnostics?.().stage === "displayed",
    null,
    { timeout: 120000 },
  );
  assert.equal(
    await mobile
      .getByRole("button", { name: "동작 설정 접기" })
      .getAttribute("aria-expanded"),
    "true",
  );
  assert(
    await mobile
      .getByText(
        "주변 건물·시뮬레이션을 불러오지 못했습니다. 새로고침해 다시 시도해 주세요.",
        { exact: true },
      )
      .isVisible(),
  );
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(mobileErrors, []);
  const mobileResolution = await mobile.evaluate(
    () => window.__aksDiagnostics().renderResolution,
  );
  assert(mobileResolution.width >= mobileResolution.cssWidth * 1.99);
  await mobile.screenshot({ path: `${output}/mobile-recovery.png` });
  results.pages.push({
    name: "mobile-recovery",
    width: 320,
    renderResolution: mobileResolution,
    errors: mobileErrors,
  });
  await mobile.close();

  const moviePath = "/media/aks-campus-update-20261013.mp4";
  const movie = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const movieResponse = await movie.request.get(`${base}${moviePath}`);
  assert(movieResponse.ok(), "Published demo must be reachable");
  const movieBytes = await movieResponse.body();
  const movieSha = createHash("sha256").update(movieBytes).digest("hex");
  assert.equal(
    movieSha,
    createHash("sha256")
      .update(await readFile(`public${moviePath}`))
      .digest("hex"),
  );
  await movie.setContent(
    `<style>body{margin:0;background:#000}video{width:100vw;height:100vh}</style><video muted playsinline controls src="${base}${moviePath}"></video>`,
  );
  await movie.waitForFunction(
    () => document.querySelector("video").readyState >= 2,
  );
  const metadata = await movie.locator("video").evaluate(async (video) => {
    await video.play();
    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  });
  assert.equal(metadata.duration, 82);
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.height, 1080);
  await movie.waitForTimeout(1800);
  assert(
    await movie
      .locator("video")
      .evaluate((video) => video.currentTime > 1 && !video.error),
  );
  await movie.locator("video").evaluate((video) => {
    video.pause();
    video.currentTime = 73;
  });
  await movie.waitForFunction(() => !document.querySelector("video").seeking);
  await movie.screenshot({ path: `${output}/video-mobile-comparison.png` });
  results.media = {
    url: `${base}${moviePath}`,
    bytes: movieBytes.length,
    sha256: movieSha,
    ...metadata,
  };
  await movie.close();
  console.log(
    JSON.stringify({
      base,
      assetsVerified: results.assets.length,
      pages: results.pages,
      media: results.media,
    }),
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
