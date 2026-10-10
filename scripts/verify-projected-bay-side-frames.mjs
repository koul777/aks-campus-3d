// Execute the actual detail builder on CPU, then compare to pre-fix geometry.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3, DoubleSide } from 'three';

const directory = 'artifacts/projected-bay-side-frame';
await mkdir(directory, { recursive: true });
const source = await readFile('src/building-model.ts', 'utf8');
const parsed = ts.createSourceFile('building-model.ts', source, ts.ScriptTarget.ES2022, true);
const functionNode = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'addVerifiedDetails');
const threeImport = parsed.statements.find(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'three');
const materialNode = parsed.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(parsed) === 'material'));
assert(functionNode && threeImport && materialNode);
const fixtureSource = `${threeImport.getText(parsed)}
const materialCache = new Map();
const environmentGlassTrial = false, syntheticGlassPattern = false;
${materialNode.getText(parsed)}
export ${functionNode.getText(parsed)}`;
await writeFile(`${directory}/actual-detail-builder.mjs`, ts.transpileModule(fixtureSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
await writeFile(`${directory}/geographic-buildings.mjs`, ts.transpileModule(await readFile('src/data/geographic-buildings.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText);
const { addVerifiedDetails } = await import(`../${directory}/actual-detail-builder.mjs`);
const { geographicBuildings } = await import(`../${directory}/geographic-buildings.mjs`);
const colorOf = mesh => mesh.material.color.getHexString();
const frameColor = 'd6d5c9', glassColor = '3b5052';
const referenceMesh = (dimensions, position, color, metalness = 0) => {
  const mesh = new Mesh(new BoxGeometry(...dimensions), new MeshStandardMaterial({ color, metalness, roughness: color === '#3b5052' ? 0.22 : 0.78, side: DoubleSide }));
  mesh.position.set(...position);
  return mesh;
};
// Independent, literal reconstruction of the captured pre-fix bay mesh contract.
const oldWindow = (row, descriptor) => {
  const window = new Group(), depth = row.projected ? descriptor.projectionDepth : 0.08;
  window.add(referenceMesh([row.width, row.height, 0.055], [0, row.height / 2, depth], '#3b5052', 0.25));
  if (row.projected) for (const direction of [-1, 1]) window.add(referenceMesh([0.055, row.height, descriptor.sidePaneWidth], [direction * row.width / 2, row.height / 2, depth - descriptor.sidePaneWidth / 2], '#3b5052', 0.25));
  for (const direction of [-1, 1]) window.add(referenceMesh([descriptor.frameWidth, row.height + 0.16, depth + 0.08], [direction * (row.width / 2 + 0.04), row.height / 2, depth / 2], '#d6d5c9'));
  for (const height of [-0.04, row.height + 0.04]) window.add(referenceMesh([row.width + 0.18, descriptor.frameWidth, depth + 0.16], [0, height, depth / 2], '#d6d5c9'));
  window.add(referenceMesh([0.05, row.height, 0.06], [0, row.height / 2, depth + 0.04], '#929b93'));
  return window;
};
const signature = meshes => meshes.map(mesh => ({
  position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(),
  attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]) => [name, Array.from(attribute.array)])),
  index: Array.from(mesh.geometry.index.array), color: colorOf(mesh),
  roughness: mesh.material.roughness, metalness: mesh.material.metalness, side: mesh.material.side,
}));
const sideFrames = (window, row) => window.children.filter(mesh => colorOf(mesh) === frameColor && mesh.geometry.parameters.height === row.height + 0.16);
const firstSideHit = (window, row, direction, z) => {
  // Remove façade/row transform for a local side-on comparison of the complete bay.
  window.position.set(0, 0, 0);
  window.parent?.remove(window);
  window.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(direction * (row.width / 2 + 1), row.height / 2, z), new Vector3(-direction, 0, 0));
  return ray.intersectObjects(window.children, false)[0]?.object;
};
let projectedBays = 0, flatBays = 0, middleRayComparisons = 0, perimeterRayChecks = 0;
const rows = [];
for (const id of ['gugeun', 'jinhyeon']) {
  const building = geographicBuildings.find(item => item.id === id);
  const part = building.parts.find(item => item.photoBayWindows);
  const descriptor = part.photoBayWindows, group = new Group();
  addVerifiedDetails(group, part);
  const front = group.children[0];
  assert.equal(front.children.length, descriptor.rows.reduce((sum, row) => sum + row.centers.length, 0));
  const windows = [...front.children];
  let cursor = 0;
  for (const row of descriptor.rows) {
    for (const center of row.centers) {
      const actual = windows[cursor++], baseline = oldWindow(row, descriptor);
      assert.deepEqual(actual.position.toArray(), [center, row.bottom, 0]);
      if (!row.projected) {
        assert.deepEqual(signature(actual.children), signature(baseline.children));
        flatBays++;
        continue;
      }
      projectedBays++;
      const actualFrames = sideFrames(actual, row), baselineFrames = sideFrames(baseline, row);
      assert.equal(actualFrames.length, 4);
      assert.equal(baselineFrames.length, 2);
      assert.deepEqual(signature(actual.children.filter(mesh => !actualFrames.includes(mesh))), signature(baseline.children.filter(mesh => !baselineFrames.includes(mesh))));
      const rear = descriptor.projectionDepth - descriptor.sidePaneWidth, frontZ = descriptor.projectionDepth;
      for (const frame of actualFrames) {
        assert.equal(frame.geometry.parameters.depth, descriptor.frameWidth);
        assert(frame.position.z - descriptor.frameWidth / 2 >= rear - 1e-12);
        assert(frame.position.z + descriptor.frameWidth / 2 <= frontZ + 1e-12);
        assert.equal(frame.geometry.parameters.width, descriptor.frameWidth);
      }
      // Three rays in each exposed middle return, across both bay sides.
      for (const direction of [-1, 1]) for (const fraction of [0.3, 0.5, 0.7]) {
        const z = rear + descriptor.sidePaneWidth * fraction;
        assert.equal(colorOf(firstSideHit(baseline, row, direction, z)), frameColor);
        assert.equal(colorOf(firstSideHit(actual, row, direction, z)), glassColor);
        middleRayComparisons++;
      }
      for (const direction of [-1, 1]) for (const z of [rear + descriptor.frameWidth / 2, frontZ - descriptor.frameWidth / 2]) {
        assert.equal(colorOf(firstSideHit(actual, row, direction, z)), frameColor);
        perimeterRayChecks++;
      }
    }
    rows.push({ building: id, projected: row.projected, bays: row.centers.length, widthMetres: row.width, heightMetres: row.height });
  }
}
const users = geographicBuildings.flatMap(building => building.parts.filter(part => part.photoBayWindows).map(part => ({ building: building.id, part: part.id })));
assert.deepEqual(users.map(item => item.building).sort(), ['gugeun', 'jinhyeon']);
const result = {
  scope: users, projectedBays, flatBaysExactMatch: flatBays,
  sidePanesExposedByMiddleRayComparisons: middleRayComparisons,
  retainedPerimeterPostRayChecks: perimeterRayChecks,
  nonJambMeshesExactMatch: true,
  projectionDepthMetres: 0.55, sidePaneWidthMetres: 0.4,
  sidePaneDepthIntervalMetres: [0.15, 0.55], exposedMiddleIntervalMetres: [0.25, 0.45],
  rows,
  limitation: 'Actual CPU builder geometry and ray intersection proof; rendered appearance remains for same-camera review.',
};
await writeFile(`${directory}/result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
