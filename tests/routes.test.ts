import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildSampledRoute,
  pointInsidePolygon,
  resampleRoute,
  roundRoute,
  sampleRoute,
  type Point2,
} from "../src/route-math";
import { createRouteSpecs } from "../src/data/campus-routes";
import {
  getSurroundingBuildings,
  type SurroundingsData,
} from "../src/data/surroundings";
import { generateRouteAudit } from "../scripts/export-route-audit";
const data = JSON.parse(
  await readFile("public/data/surroundings.json", "utf8"),
) as SurroundingsData;
const specs = createRouteSpecs(data);

test("closed walking routes wrap continuously with finite heights", () => {
  const points = resampleRoute(
    roundRoute(
      [
        [0, 0],
        [30, 0],
        [30, 10],
        [0, 10],
      ],
      true,
      1.5,
    ),
    0.5,
  );
  const route = buildSampledRoute(
    "test",
    points,
    points.map(([x, y]) => 100 + x * 0.05 + y * 0.03),
    true,
  );
  assert.deepEqual(points[0], points.at(-1));
  for (let i = 1; i < points.length; i++)
    assert(
      Math.hypot(
        points[i][0] - points[i - 1][0],
        points[i][1] - points[i - 1][1],
      ) <= 0.50001,
    );
  for (const distance of [
    -0.001,
    0,
    route.length - 0.001,
    route.length,
    route.length * 1000,
  ]) {
    const sample = sampleRoute(route, distance);
    assert(Object.values(sample).every(Number.isFinite));
    assert(
      sample.east >= 0 &&
        sample.east <= 30 &&
        sample.north >= 0 &&
        sample.north <= 10,
    );
  }
  const a = sampleRoute(route, -0.001),
    b = sampleRoute(route, 0.001);
  assert(Math.hypot(a.east - b.east, a.north - b.north) < 0.003);
  assert.throws(() =>
    buildSampledRoute(
      "bad",
      [
        [0, 0],
        [10, 0],
      ],
      [100, NaN],
      false,
    ),
  );
});

test("buses and cars use identical centre lines and stable, separated phases", () => {
  for (const direction of ["east", "west"]) {
    const car = specs.find((s) => s.id === `haogae-${direction}`)!,
      bus = specs.find((s) => s.id === `express-${direction}`)!;
    assert.deepEqual(car.points, bus.points);
    assert.equal(car.speed, bus.speed);
    const route = buildSampledRoute(
      car.id,
      car.points,
      car.points.map(() => 0),
      false,
    );
    const phases = [
      ...Array.from({ length: car.count }, (_, i) => ({
        phase: (i / car.count + 0.04) % 1,
        length: 4.5,
      })),
      ...Array.from({ length: bus.count }, (_, i) => ({
        phase: (i / bus.count + 0.115) % 1,
        length: 11.8,
      })),
    ].sort((a, b) => a.phase - b.phase);
    for (let i = 0; i < phases.length; i++) {
      const a = phases[i],
        b = phases[(i + 1) % phases.length];
      const gap = ((b.phase - a.phase + 1) % 1) * route.length;
      assert(gap > (a.length + b.length) / 2 + 10);
    }
  }
  const east = specs.find((s) => s.id === "express-east")!,
    west = specs.find((s) => s.id === "express-west")!;
  const a = buildSampledRoute(
      east.id,
      east.points,
      east.points.map(() => 0),
      false,
    ),
    b = buildSampledRoute(
      west.id,
      west.points,
      west.points.map(() => 0),
      false,
    );
  assert(Math.abs(a.length - b.length) < 0.00001);
  for (let d = 20; d < a.length - 20; d += 7) {
    const p = sampleRoute(a, d, east.lane),
      q = sampleRoute(b, b.length - d, west.lane);
    assert(Math.abs(Math.hypot(p.east - q.east, p.north - q.north) - 3.4) < 0.06);
  }
});

test("the surrounding dataset retains provenance, unique polygons and 156 modelled buildings", () => {
  const buildings = getSurroundingBuildings(data);
  assert.equal(buildings.length, 156);
  assert.equal(new Set(buildings.map((b) => b.id)).size, buildings.length);
  for (const feature of data.buildings) {
    assert.deepEqual(feature.coordinates[0], feature.coordinates.at(-1));
    assert(feature.coordinates.every((p) => p.every(Number.isFinite)));
  }
  for (const b of buildings)
    assert(
      Number.isFinite(b.height) && b.height > 0 && b.footprint.length >= 3,
    );
  assert(data.source.startsWith("https://api.openstreetmap.org/"));
});

const bounds = (points: number[][]) => [
  Math.min(...points.map((p) => p[0])),
  Math.min(...points.map((p) => p[1])),
  Math.max(...points.map((p) => p[0])),
  Math.max(...points.map((p) => p[1])),
];
const cross = (a: number[], b: number[], c: number[]) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function intersects(a: number[][], b: number[][]) {
  if (
    a.some((p) => pointInsidePolygon(p as Point2, b as Point2[])) ||
    b.some((p) => pointInsidePolygon(p as Point2, a as Point2[]))
  )
    return true;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      const p = a[i],
        q = a[(i + 1) % a.length],
        r = b[j],
        s = b[(j + 1) % b.length];
      if (
        cross(p, q, r) * cross(p, q, s) < -1e-10 &&
        cross(r, s, p) * cross(r, s, q) < -1e-10
      )
        return true;
    }
  return false;
}
test("full actor bodies clear campus, neighbours, stairs and water along all nine routes", async () => {
  const audit = await generateRouteAudit();
  assert.equal(audit.routes.length, 9);
  const obstacles = audit.obstacles.map((o) => ({
    ...o,
    bounds: bounds(o.points),
  }));
  let checks = 0;
  for (const route of audit.routes)
    for (const sample of route.samples) {
      const [x0, y0, x1, y1] = bounds(sample.points);
      for (const obstacle of obstacles) {
        const [a, b, c, d] = obstacle.bounds;
        if (x1 < a || x0 > c || y1 < b || y0 > d) continue;
        checks++;
        assert(
          !intersects(sample.points, obstacle.points),
          `${route.id} at ${sample.distance}m intersects ${obstacle.id}`,
        );
      }
    }
  assert(checks > 0);
});
