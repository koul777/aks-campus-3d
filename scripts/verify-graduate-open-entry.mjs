// Actual pre-export model construction on CPU; canvas drawing is mocked, no GPU.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { Mesh, Raycaster, Vector3 } from 'three';
const directory = 'artifacts/graduate-open-entry';
await mkdir(directory, { recursive: true });
const source = await readFile('src/building-model.ts', 'utf8');
const parsed = ts.createSourceFile('building-model.ts', source, ts.ScriptTarget.ES2022, true);
const builder = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'createBuildingGlb');
assert(builder);
let prefix = source.slice(0, builder.getStart(parsed));
for (const node of [...parsed.statements].reverse()) {
  if (ts.isImportDeclaration(node) && node.moduleSpecifier.text !== 'three' && node.end < builder.getStart(parsed)) {
    prefix = prefix.slice(0, node.getStart(parsed)) + prefix.slice(node.end);
  }
}
const body = builder.getText(parsed);
const stop = body.indexOf('// Static windows');
assert(stop > 0);
const fixture = `${prefix}
import { createRoofFrames, roofMetricUv } from './roof-uv.mjs';
import { roofMaterialTrial } from './roof-material.mjs';
const hakuRoofProfileTrial = {buildingId:'hakuijeong'};
${body.slice(0, stop)} return group;
}`;
for (const [name, code] of [['actual-builder', fixture], ['geographic-buildings', await readFile('src/data/geographic-buildings.ts', 'utf8')], ['roof-uv', await readFile('src/roof-uv.ts', 'utf8')], ['roof-material', await readFile('src/data/roof-material.ts', 'utf8')]]) {
  await writeFile(`${directory}/${name}.mjs`, ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText);
}
globalThis.document = { createElement() { return {
  width: 0, height: 0,
  getContext() { return { fillRect() {}, fillText() {}, putImageData() {}, createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; } }; },
}; } };
const { createBuildingGlb: construct } = await import(`../${directory}/actual-builder.mjs`);
const { geographicBuildings } = await import(`../${directory}/geographic-buildings.mjs`);
const graduate = geographicBuildings.find(building => building.id === 'graduate-school');
const entry = graduate.parts.find(part => part.id === 'graduate-entry-roof');
const make = (part, open, id = graduate.id) => construct({ ...graduate, id, parts: [part], site: undefined }, undefined, { graduateEntry: open ? 'open' : undefined });
const signature = mesh => JSON.stringify({
  position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(),
  attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]) => [name, Array.from(attribute.array)])),
  index: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
  color: mesh.material.color.getHexString(), roughness: mesh.material.roughness,
  metalness: mesh.material.metalness, side: mesh.material.side,
  hasMap: !!mesh.material.map, hasNormal: !!mesh.material.normalMap,
});
const meshes = group => { const result = []; group.traverse(object => { if (object instanceof Mesh) result.push(object); }); return result; };
const baseline = await make(entry, false), open = await make(entry, true);
baseline.updateMatrixWorld(true); open.updateMatrixWorld(true);
const original = meshes(baseline), candidate = meshes(open);
// The open path introduces no new shape/material: roof, slabs and supports are
// exact existing meshes. Removed shapes are the solid body and generic details.
const baselineSignatures = original.map(signature);
assert(candidate.length < original.length);
for (const mesh of candidate) assert(baselineSignatures.includes(signature(mesh)), 'Retained component must exactly match baseline');
const color = mesh => mesh.material.color.getHexString();
assert.equal(candidate.filter(mesh => color(mesh) === 'eee9dc').length, 4);
assert.equal(candidate.filter(mesh => color(mesh) === 'b3b1a5').length, 1);
assert.equal(candidate.filter(mesh => color(mesh) === 'bcbcaf').length, 1);
assert.equal(original.filter(mesh => mesh.userData.photoPartId === entry.id && mesh.userData.photoSurface === 'cladding').length, 1);
assert.equal(candidate.filter(mesh => mesh.userData.photoPartId === entry.id).length, 0);
assert(original.some(mesh => color(mesh) === 'b5b7a9' && mesh.position.y === 5.25));
assert(!candidate.some(mesh => color(mesh) === 'b5b7a9'));
const originalRoof = original.filter(mesh => color(mesh) === entry.roof.color.slice(1));
const candidateRoof = candidate.filter(mesh => color(mesh) === entry.roof.color.slice(1));
assert.deepEqual(candidateRoof.map(signature), originalRoof.map(signature));
// Interior approach rays sit above the preserved floor and below the soffit.
let approachRays = 0;
for (const x of [6, 7.5, 9]) for (const height of [1.2, 1.8, 2.4]) {
  const ray = new Raycaster(new Vector3(x, height, 20), new Vector3(0, 0, -1), 0, 9);
  assert(ray.intersectObjects(original, false).some(hit => hit.object.userData.photoPartId === entry.id && hit.object.userData.photoSurface === 'cladding'));
  assert.equal(ray.intersectObjects(candidate, false).length, 0);
  approachRays++;
}
const unchangedParts = [];
for (const part of graduate.parts.filter(part => part.id !== entry.id)) {
  assert.deepEqual(meshes(await make(part, true)).map(signature), meshes(await make(part, false)).map(signature));
  unchangedParts.push(part.id);
}
// Both building and part guards are required; the same descriptor remains default elsewhere.
assert.deepEqual(meshes(await make(entry, true, 'guard-other-building')).map(signature), baselineSignatures);
assert.deepEqual(meshes(await make({ ...entry, id: 'guard-other-part' }, true)).map(signature), baselineSignatures);
const result = {
  baselineEntryMeshCount: original.length, openEntryMeshCount: candidate.length,
  everyRetainedMeshExactBaselineMatch: true, roofGeometryTransformsMaterialsExactMatch: true,
  existingFloorAndSoffitExactMatch: true, explicitSupportCountUnchanged: 4,
  solidBodyRemoved: true, genericBeamAtHeight5_25Removed: true, clearApproachRayCount: approachRays,
  otherGraduatePartsExactMatch: unchangedParts, buildingAndPartScopeGuardsPassed: true,
  canopyCenterEastMetres: 7.5, canopyHeightMetres: 3.1, roofApexDatumMetres: 4.3,
  doorwayAlignmentUnchangedAndUnproven: true,
  limitation: 'Actual pre-export CPU construction, with canvas texture drawing mocked; rendered A/B remains required.',
};
await writeFile(`${directory}/result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
