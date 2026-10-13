import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const output = "public/models/moving";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  reducedMotion: "reduce",
});
try {
  await page.goto("http://127.0.0.1:5173/?diagnostics=1&actors=procedural");
  await page.waitForFunction(
    () => window.__aksDiagnostics?.().stage === "displayed",
    null,
    { timeout: 120000 },
  );
  const assets = await page.evaluate(async () => {
    const output = [];
    for (const asset of window.__aksDiagnostics().life.assetUrls) {
      const bytes = new Uint8Array(
        await (await fetch(asset.url)).arrayBuffer(),
      );
      let binary = "";
      for (let i = 0; i < bytes.length; i += 16384)
        binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      output.push({ ...asset, base64: btoa(binary) });
    }
    return output;
  });
  const manifest = [];
  for (const { base64, ...asset } of assets) {
    const bytes = Buffer.from(base64, "base64"),
      name = `${asset.kind}-${asset.variant}.glb`;
    await writeFile(`${output}/${name}`, bytes);
    manifest.push({
      ...asset,
      url: `/models/moving/${name}`,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  await writeFile(
    `${output}/manifest.json`,
    JSON.stringify({ generated: "2026-10-13", assets: manifest }, null, 2),
  );
  console.log(`Exported ${assets.length} moving assets`);
} finally {
  await browser.close();
}
