// CPU-only verification against actual Haku roof triangles; no browser or GPU.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { Group, Mesh, MeshStandardMaterial, Vector3, Raycaster } from 'three';

const directory = 'artifacts/haku-geometry-compact';
await mkdir(`${directory}/data`, { recursive: true });
for (const name of ['haku-rafter-compact', 'pavilion-model', 'haku-roof-model', 'data/pavilion-details', 'data/haku-roof-profile', 'data/geographic-buildings']) {
  const code = ts.transpileModule(await readFile(`src/${name}.ts`, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText.replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, '$1$2.mjs$3');
  await writeFile(`${directory}/${name}.mjs`, code);
}
const { addPavilionDetails } = await import(`../${directory}/pavilion-model.mjs`);
const { addHakuCurvedRoof } = await import(`../${directory}/haku-roof-model.mjs`);
const { geographicBuildings } = await import(`../${directory}/data/geographic-buildings.mjs`);
const { compactHakuRafterSamples } = await import(`../${directory}/haku-rafter-compact.mjs`);
// Gaps must stay gaps, and a >1 mm bend must retain its knot.
const fixture = compactHakuRafterSamples([
  new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(2, 0, 0), undefined,
  new Vector3(3, 0, 0), new Vector3(4, 0.01, 0), new Vector3(5, 0, 0),
]);
assert.equal(fixture.sourceSegments, 4);
assert.equal(fixture.compactSegments, 3);
assert.equal(fixture.samples[2], undefined);
assert.equal(fixture.maximumUpwardDeviationMetres, 0);

const building = geographicBuildings.find(item => item.id === 'hakuijeong');
const part = building.parts.find(item => item.id === 'hakuijeong-pavilion');
const makeGroup = mode => {
  const group = new Group();
  addHakuCurvedRoof(group, part, new MeshStandardMaterial());
  addPavilionDetails(group, building, part, mode);
  group.updateMatrixWorld(true);
  return group;
};
const baseline = makeGroup(undefined), compact = makeGroup('compact');
const isRafter = mesh => mesh instanceof Mesh && mesh.geometry.type === 'CylinderGeometry' && mesh.geometry.parameters.radiusTop === 0.07;
const rafters = group => group.children.filter(isRafter).map(mesh => {
  const half = mesh.geometry.parameters.height / 2;
  return {
    a: new Vector3(0, -half, 0).applyQuaternion(mesh.quaternion).add(mesh.position),
    b: new Vector3(0, half, 0).applyQuaternion(mesh.quaternion).add(mesh.position),
  };
});
const original = rafters(baseline), candidate = rafters(compact);
assert(candidate.length < original.length);
// All other components, positions, UVs, normal attributes and index buffers are identical.
const signature = group => group.children.filter(mesh => mesh instanceof Mesh && !isRafter(mesh)).map(mesh => ({
  position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(),
  attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, value]) => [name, Array.from(value.array)])),
  indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
}));
assert.deepEqual(signature(compact), signature(baseline));
// Match each original endpoint/midpoint to the compact span on the same plan path.
// Endpoints cover every original sampling knot; differences are linear between knots.
let maximumDownward = 0, maximumUpward = 0, comparisons = 0;
for (const source of original) for (const fraction of [0, 0.5, 1]) {
  const point = source.a.clone().lerp(source.b, fraction);
  const matches = candidate.flatMap(span => {
    const dx = span.b.x - span.a.x, dz = span.b.z - span.a.z;
    const squared = dx * dx + dz * dz;
    const t = ((point.x - span.a.x) * dx + (point.z - span.a.z) * dz) / squared;
    const horizontalError = Math.hypot(span.a.x + dx * t - point.x, span.a.z + dz * t - point.z);
    // Parallel offset rafters cannot match; at crossings choose the closest height.
    return t >= -1e-8 && t <= 1 + 1e-8 && horizontalError < 1e-8
      ? [span.a.y + (span.b.y - span.a.y) * t - point.y] : [];
  });
  assert(matches.length, 'Original knot must lie on a compact plan span');
  const drift = matches.sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  maximumDownward = Math.max(maximumDownward, -drift);
  maximumUpward = Math.max(maximumUpward, drift);
  assert(drift <= 1e-9 && drift >= -0.002 - 1e-9);
  comparisons++;
}

const roofs = compact.children.filter(mesh => mesh instanceof Mesh && mesh.userData.pavilionRoofSurface);
const ray = new Raycaster();
const offsets = [[0, 0], [0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07], [0.05, 0.05], [0.05, -0.05], [-0.05, 0.05], [-0.05, -0.05]];
let minimumVerticalClearance = Infinity, roofRayHits = 0;
for (const span of candidate) for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
  const point = span.a.clone().lerp(span.b, fraction);
  for (const [dx, dz] of offsets) {
    ray.set(new Vector3(point.x + dx, part.baseHeight + part.height + part.roof.height + 5, point.z + dz), new Vector3(0, -1, 0));
    const height = ray.intersectObjects(roofs, false)[0]?.point.y;
    if (height === undefined) continue;
    minimumVerticalClearance = Math.min(minimumVerticalClearance, height - point.y - 0.07);
    roofRayHits++;
  }
}
assert(minimumVerticalClearance >= 0.08);
const report = {
  sourceRafterCylinderCount: original.length,
  compactRafterCylinderCount: candidate.length,
  sourceRafterTriangles: original.length * 32,
  compactRafterTriangles: candidate.length * 32,
  removedRafterTriangles: (original.length - candidate.length) * 32,
  maximumDownwardDeviationMetres: maximumDownward,
  maximumUpwardDeviationMetres: maximumUpward,
  originalKnotAndMidpointComparisons: comparisons,
  compactSpanRoofRayHits: roofRayHits,
  sampledMinimumVerticalRoofClearanceMetres: minimumVerticalClearance,
  nonRafterComponentsExactMatch: true,
  generationStats: compact.userData.pavilionGeometryCompact,
  limitation: 'CPU geometry audit and sampled clearance, not an actual rendered A/B or runtime benchmark.',
};
await writeFile(`${directory}/result.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
