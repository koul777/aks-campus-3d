import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import validator from "gltf-validator";
import { Box3, Matrix4, Vector3, Quaternion } from "three";
const out = "artifacts/upgrade-20261013/model-validation";
await mkdir(out, { recursive: true });
function document(bytes) {
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
}
function bounds(doc) {
  const result = new Box3();
  function visit(index, parent) {
    const node = doc.nodes[index];
    const local = node.matrix
      ? new Matrix4().fromArray(node.matrix)
      : new Matrix4().compose(
          new Vector3(...(node.translation ?? [0, 0, 0])),
          new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
          new Vector3(...(node.scale ?? [1, 1, 1])),
        );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined)
      for (const p of doc.meshes[node.mesh].primitives) {
        const a = doc.accessors[p.attributes.POSITION];
        result.union(
          new Box3(new Vector3(...a.min), new Vector3(...a.max)).applyMatrix4(
            world,
          ),
        );
      }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const index of doc.scenes[doc.scene ?? 0].nodes)
    visit(index, new Matrix4());
  return { min: result.min.toArray(), max: result.max.toArray() };
}
const summary = [];
const manifest = JSON.parse(
  await readFile("public/models/blender/manifest.json", "utf8"),
);
const packed = JSON.parse(
  await readFile("public/models/campus/manifest.json", "utf8"),
);
for (const entry of [
  ...manifest.models.map((m) => ({ ...m, folder: "blender" })),
  ...packed.models.map((m) => ({ ...m, folder: "campus" })),
]) {
  const id = entry.id;
  const bytes = await readFile(`public/models/${entry.folder}/${id}.glb`),
    doc = document(bytes);
  const report = await validator.validateBytes(new Uint8Array(bytes), {
    uri: `${id}.glb`,
    maxIssues: 100,
  });
  await writeFile(`${out}/${id}.json`, JSON.stringify(report, null, 2));
  assert.equal(report.issues.numErrors, 0, `${id} glTF validation errors`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    entry.outputSha256,
    `${id} manifest checksum is stale`,
  );
  if (entry.folder === "blender")
    assert(
      doc.meshes.every((mesh) =>
        mesh.primitives.every((p) => p.attributes.COLOR_0 !== undefined),
      ),
      `${id} baked AO missing`,
    );
  const actual = bounds(doc);
  let original;
  try {
    original = bounds(
      document(
        await readFile(`artifacts/upgrade-20261013/blender-input/${id}.glb`),
      ),
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (original)
    for (const extent of ["min", "max"])
      for (let axis = 0; axis < 3; axis++)
        assert(
          Math.abs(actual[extent][axis] - original[extent][axis]) < 0.08,
          `${id} moved/resized on axis ${axis}`,
        );
  summary.push({
    id,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bounds: actual,
    originalBounds: original,
    errors: report.issues.numErrors,
    warnings: report.issues.numWarnings,
  });
}
const moving = JSON.parse(
  await readFile("public/models/moving/manifest.json", "utf8"),
);
for (const asset of moving.assets) {
  const name = `${asset.kind}-${asset.variant}`,
    bytes = await readFile(`public${asset.url}`),
    doc = document(bytes);
  const report = await validator.validateBytes(new Uint8Array(bytes), {
    uri: `${name}.glb`,
    maxIssues: 100,
  });
  await writeFile(`${out}/${name}.json`, JSON.stringify(report, null, 2));
  assert.equal(report.issues.numErrors, 0, `${name} glTF errors`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  if (asset.kind === "person") {
    assert.equal(doc.skins.length, 1);
    assert(doc.animations.some((a) => a.name === "walk"));
    assert(
      doc.meshes.reduce((n, m) => n + m.primitives.length, 0) <= 7,
      "walker material batching regressed",
    );
  }
  summary.push({
    id: name,
    bytes: bytes.length,
    errors: report.issues.numErrors,
    warnings: report.issues.numWarnings,
  });
}
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
