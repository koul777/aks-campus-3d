import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  getSurroundingBuildings,
  surroundingsSignature,
} from "../src/data/surroundings";
const root = "artifacts/upgrade-20261013";
const data = JSON.parse(
  await readFile("public/data/surroundings.json", "utf8"),
);
const metadata = JSON.parse(
  await readFile(`${root}/blender-input/surroundings.json`, "utf8"),
);
metadata.geometrySignature = surroundingsSignature(
  getSurroundingBuildings(data),
);
metadata.model = "/models/blender/surroundings.glb";
metadata.generated = "2026-10-13";
await writeFile(
  "public/models/blender/surroundings.json",
  JSON.stringify(metadata),
);
const models = [];
for (const id of ["main", "hall", "library", "jangseogak", "surroundings"]) {
  const report = JSON.parse(
    await readFile(`${root}/blender/${id}-report.json`, "utf8"),
  );
  const placement = JSON.parse(
    await readFile(`${root}/blender-input/${id}.json`, "utf8"),
  );
  const binary = await readFile(`public/models/blender/${id}.glb`);
  models.push({
    ...report,
    bytes: binary.length,
    outputSha256: createHash("sha256").update(binary).digest("hex"),
    anchor: placement.anchor,
    groundHeight: placement.groundHeight,
    groundClearance: placement.groundClearance,
  });
}
const manifest = {
  generated: "2026-10-13",
  blender: "4.5.9 LTS",
  pipeline: "scripts/blender-refine.py",
  description:
    "Source-proportioned visual models. Blender edge bevels and deterministic vertex AO; Draco-compressed GLB. Not surveyed or photogrammetric.",
  models,
};
await writeFile(
  "public/models/blender/manifest.json",
  JSON.stringify(manifest, null, 2),
);
console.log(
  `Published ${models.length} assets, ${models.reduce((n, m) => n + m.bytes, 0)} bytes`,
);
