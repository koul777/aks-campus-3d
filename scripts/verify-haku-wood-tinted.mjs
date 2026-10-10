// Test material/UV behavior using mock texture loading; no browser or asset editing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Texture, TextureLoader } from 'three';

const directory = 'artifacts/haku-wood-tinted';
await mkdir(`${directory}/data`, { recursive: true });
for (const name of ['pavilion-model', 'haku-rafter-compact', 'data/pavilion-details']) {
  const compiled = ts.transpileModule(await readFile(`src/${name}.ts`, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText.replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, '$1$2.mjs$3');
  await writeFile(`${directory}/${name}.mjs`, compiled);
}
const { applyHakuWoodTrial } = await import(`../${directory}/pavilion-model.mjs`);
const { hakuWoodMaterialTrial: trial } = await import(`../${directory}/data/pavilion-details.mjs`);
let loads = [];
TextureLoader.prototype.loadAsync = async path => { loads.push(path); return new Texture(); };
const make = () => {
  const group = new Group();
  const warm = ['#846143', '#A77B4F'].map(color => {
    const material = new MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 });
    material.name = 'haku-exposed-wood';
    return material;
  });
  group.add(new Mesh(new BoxGeometry(3, 0.2, 0.2), warm[0]), new Mesh(new CylinderGeometry(0.07, 0.07, 1.2, 8), warm[1]), new Mesh(new BoxGeometry(0.2, 2, 0.2), warm[0]));
  const other = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#4e585b' }));
  group.add(other);
  return { group, original: group.children.slice(0, 3).map(mesh => mesh.material), other };
};
const modes = {};
for (const mode of ['source', 'normal', 'tinted']) {
  const { group, original, other } = make(), previousOther = other.material;
  loads = [];
  await applyHakuWoodTrial(group, mode === 'normal', mode === 'tinted');
  assert.strictEqual(other.material, previousOther);
  const meshes = group.children.slice(0, 3);
  if (mode === 'tinted') {
    assert.deepEqual(loads, [trial.diffuse]);
    for (const [index, mesh] of meshes.entries()) {
      assert(mesh.material.map);
      assert.equal(mesh.material.normalMap, null);
      assert(mesh.material.color.equals(original[index].color));
      assert.equal(mesh.material.roughness, original[index].roughness);
      assert.equal(mesh.material.metalness, original[index].metalness);
      assert.equal(mesh.material.userData.actualCampusScan, false);
      assert.equal(mesh.material.userData.sourcePixelsUnmodified, true);
    }
    assert.strictEqual(meshes[0].material, meshes[2].material);
    assert.notStrictEqual(meshes[0].material, meshes[1].material);
  } else if (mode === 'normal') {
    assert.deepEqual(loads, [trial.normalGL]);
    for (const [index, mesh] of meshes.entries()) {
      assert.equal(mesh.material.map, null);
      assert(mesh.material.normalMap);
      assert(mesh.material.color.equals(original[index].color));
      assert.equal(mesh.material.normalScale.x, 0.06);
    }
  } else {
    assert.deepEqual(loads, [trial.diffuse, trial.normalGL]);
    for (const mesh of meshes) {
      assert.equal(mesh.material.color.getHexString(), 'ffffff');
      assert(mesh.material.map && mesh.material.normalMap);
      assert.equal(mesh.material.normalScale.x, 0.12);
    }
  }
  modes[mode] = { loadedTextures: [...loads], uv: meshes.map(mesh => Array.from(mesh.geometry.attributes.uv.array)) };
}
assert.deepEqual(modes.tinted.uv, modes.normal.uv);
assert.deepEqual(modes.tinted.uv, modes.source.uv);
const manifest = JSON.parse(await readFile('public/materials/haku-wood096/manifest.json', 'utf8'));
const hashes = [];
for (const file of manifest.files) {
  const bytes = await readFile(`public${file.path}`);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, file.sha256);
  assert.equal(bytes.length, file.bytes);
  hashes.push({ role: file.role, sha256: hash, bytes: bytes.length });
}
const result = {
  tintedOnlyLoadsDiffuse: true, tintedNormalMapAbsent: true,
  originalWarmColorsRoughnessMetalnessPreserved: true,
  sourceAndNormalLegacyBehaviorPreserved: true,
  longAxisUVExactMatchAcrossModes: true, nonWoodMaterialUntouched: true,
  sourceAssetHashesMatchManifest: hashes,
  limitation: 'Mock texture loading tests actual material/UV code; visual fidelity requires actual rendered A/B.',
};
await writeFile(`${directory}/result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
