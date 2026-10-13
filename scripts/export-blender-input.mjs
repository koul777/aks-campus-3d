import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = "artifacts/upgrade-20261013/blender-input";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1500, height: 950 },
  reducedMotion: "reduce",
});
try {
  await page.goto(
    "http://127.0.0.1:5173/?diagnostics=1&blender=legacy&models=procedural&surroundings=procedural",
  );
  await page.waitForFunction(
    () => window.__aksDiagnostics?.().stage === "displayed",
    undefined,
    { timeout: 120000 },
  );
  const requested = process.argv.slice(2);
  const targets = requested.includes("--all")
    ? await page.evaluate(() => [
        ...window.__aksDiagnostics().models.map((m) => m.id),
        "surroundings",
      ])
    : requested.length
      ? requested
      : ["main", "hall", "library", "jangseogak", "surroundings"];
  for (const id of targets) {
    const data = await page.evaluate(async (id) => {
      const diagnostic = window.__aksDiagnostics();
      const model =
        id === "surroundings"
          ? {
              blobUrl: diagnostic.life.surroundingUrl,
              groundHeight: diagnostic.life.surroundingOriginHeight,
              groundClearance: 0,
              anchor: { longitude: 127.0537, latitude: 37.3926 },
            }
          : diagnostic.models.find((m) => m.id === id);
      const bytes = new Uint8Array(
        await (await fetch(model.blobUrl)).arrayBuffer(),
      );
      let binary = "";
      for (let i = 0; i < bytes.length; i += 16384)
        binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      return {
        base64: btoa(binary),
        groundHeight: model.groundHeight,
        groundClearance: model.groundClearance,
        anchor: model.anchor,
        ...(id === "surroundings"
          ? {
              buildings: diagnostic.life.surroundingBuildings,
              meshes: diagnostic.life.surroundingMeshes,
              geometrySignature: diagnostic.life.surroundingGeometrySignature,
            }
          : {}),
      };
    }, id);
    await writeFile(`${output}/${id}.glb`, Buffer.from(data.base64, "base64"));
    const { base64, ...metadata } = data;
    await writeFile(`${output}/${id}.json`, JSON.stringify(metadata, null, 2));
    console.log(`Exported ${id}`);
  }
  await page.screenshot({ path: `${output}/overview-before-blender.png` });
} finally {
  await browser.close();
}
