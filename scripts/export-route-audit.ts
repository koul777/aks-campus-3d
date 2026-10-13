import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { geographicBuildings } from "../src/data/geographic-buildings";
import { getSurroundingBuildings, toLocal } from "../src/data/surroundings";
import { createRouteSpecs } from "../src/data/campus-routes";
import { buildSampledRoute, sampleRoute, type Point2 } from "../src/route-math";
export async function generateRouteAudit() {
  const data = JSON.parse(
    await readFile("public/data/surroundings.json", "utf8"),
  );
  const obstacles = geographicBuildings.flatMap((b) => {
    const t = (b.rotationDegrees * Math.PI) / 180,
      c = Math.cos(t),
      s = Math.sin(t),
      [e, n] = toLocal([b.anchor.longitude, b.anchor.latitude]);
    const transform = ([x, y]: Point2) => [
      e + x * c - y * s,
      n + x * s + y * c,
    ];
    const entries = b.parts.flatMap((p) => {
      if (!p.entrance) return [];
      const side = p.facadeSide ?? p.columnSide ?? "south",
        xs = p.footprint.map((p) => p[0]),
        ys = p.footprint.map((p) => p[1]);
      const x0 = Math.min(...xs),
        x1 = Math.max(...xs),
        y0 = Math.min(...ys),
        y1 = Math.max(...ys),
        cx = (x0 + x1) / 2,
        cy = (y0 + y1) / 2;
      const w = p.entrance.width / 2 + 0.4,
        d = p.entrance.depth + 1.3;
      const bounds =
        side === "south"
          ? [cx - w, y0 - d, cx + w, y0]
          : side === "north"
            ? [cx - w, y1, cx + w, y1 + d]
            : side === "east"
              ? [x1, cy - w, x1 + d, cy + w]
              : [x0 - d, cy - w, x0, cy + w];
      const [a, v, z, q] = bounds;
      return [
        {
          id: `${b.id}:${p.id}:stairs`,
          points: (
            [
              [a, v],
              [z, v],
              [z, q],
              [a, q],
            ] as Point2[]
          ).map(transform),
        },
      ];
    });
    return [
      ...b.parts
        .filter((p) => p.height > 2 && b.kind !== "underground-parking")
        .map((p) => ({
          id: `${b.id}:${p.id}`,
          points: p.footprint.map(transform),
        })),
      ...entries,
      ...(b.site?.water
        ? [{ id: `${b.id}:water`, points: b.site.water.outline.map(transform) }]
        : []),
    ];
  });
  obstacles.push(
    ...getSurroundingBuildings(data).map((b) => ({
      id: `surrounding:${b.id}`,
      points: b.footprint.map(toLocal),
    })),
  );
  const routes = createRouteSpecs(data).map((spec) => {
    const route = buildSampledRoute(
      spec.id,
      spec.points,
      spec.points.map(() => 0),
      spec.closed,
    );
    const samples = [];
    for (
      let d = spec.closed ? 0 : 12;
      d < route.length - (spec.closed ? 0 : 12);
      d += 0.5
    ) {
      const center = sampleRoute(route, d, spec.lane),
        ahead = sampleRoute(route, d + 2.5, spec.lane),
        behind = sampleRoute(route, d - 2.5, spec.lane);
      const dx = ahead.east - behind.east,
        dy = ahead.north - behind.north,
        len = Math.hypot(dx, dy) || 1;
      const width =
        spec.kind === "bus" ? 3.1 : spec.kind === "car" ? 2.2 : 0.65,
        length = spec.kind === "bus" ? 12.1 : spec.kind === "car" ? 4.8 : 0.9;
      samples.push({
        distance: d,
        center: [center.east, center.north],
        points: [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([a, b]) => [
          center.east +
            (((a * dx) / len) * length) / 2 +
            (((b * dy) / len) * width) / 2,
          center.north +
            (((a * dy) / len) * length) / 2 -
            (((b * dx) / len) * width) / 2,
        ]),
      });
    }
    return { id: spec.id, kind: spec.kind, length: route.length, samples };
  });
  return { obstacles, routes };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const data = await generateRouteAudit();
  await writeFile(
    "artifacts/upgrade-20261013/route-geometry.json",
    JSON.stringify(data),
  );
  console.log(
    `Exported ${data.routes.length} routes and ${data.obstacles.length} obstacles`,
  );
}
