export type Point2 = [number, number];
export type RoutePoint = {
  east: number;
  north: number;
  height: number;
  distance: number;
};
export type SampledRoute = {
  id: string;
  points: RoutePoint[];
  length: number;
  closed: boolean;
};
const distance = (a: Point2, b: Point2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mix = (a: Point2, b: Point2, t: number): Point2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Quadratic corner fillets stay inside the adjacent-segment triangle, unlike overshooting splines. */
export function roundRoute(
  input: Point2[],
  closed: boolean,
  radius: number,
): Point2[] {
  const points = input.filter((p, i) => !i || distance(p, input[i - 1]) > 0.01);
  if (closed && distance(points[0], points[points.length - 1]) < 0.01)
    points.pop();
  if (points.length < 2)
    throw new Error("Route needs at least two distinct points");
  const output: Point2[] = [];
  for (let i = 0; i < points.length; i++) {
    const b = points[i];
    if (!closed && (i === 0 || i === points.length - 1)) {
      output.push(b);
      continue;
    }
    const a = points[(i - 1 + points.length) % points.length],
      c = points[(i + 1) % points.length];
    const trim = Math.min(radius, distance(a, b) * 0.3, distance(b, c) * 0.3);
    const enter = mix(b, a, trim / distance(a, b)),
      exit = mix(b, c, trim / distance(b, c));
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      output.push(mix(mix(enter, b, t), mix(b, exit, t), t));
    }
  }
  if (closed) output.push([...output[0]]);
  return output;
}

export function resampleRoute(points: Point2[], spacing = 2): Point2[] {
  const output: Point2[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const steps = Math.max(
      1,
      Math.ceil(distance(points[i - 1], points[i]) / spacing),
    );
    for (let j = 1; j <= steps; j++)
      output.push(mix(points[i - 1], points[i], j / steps));
  }
  return output;
}

export function buildSampledRoute(
  id: string,
  points: Point2[],
  heights: number[],
  closed: boolean,
): SampledRoute {
  if (points.length !== heights.length || points.length < 2)
    throw new Error(`Invalid route ${id}`);
  let length = 0;
  const route = points.map((p, i) => {
    if (!Number.isFinite(heights[i]) || !p.every(Number.isFinite))
      throw new Error(`Non-finite route ${id}`);
    if (i) length += distance(points[i - 1], p);
    return { east: p[0], north: p[1], height: heights[i], distance: length };
  });
  if (length < 1) throw new Error(`Route too short: ${id}`);
  return { id, points: route, length, closed };
}

export function sampleRoute(
  route: SampledRoute,
  distanceAlong: number,
  lane = 0,
) {
  const d = route.closed
    ? ((distanceAlong % route.length) + route.length) % route.length
    : Math.max(0, Math.min(route.length, distanceAlong));
  let lo = 0,
    hi = route.points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (route.points[mid].distance <= d) lo = mid;
    else hi = mid;
  }
  const a = route.points[lo],
    b = route.points[hi],
    length = b.distance - a.distance;
  const t = length > 0 ? (d - a.distance) / length : 0;
  const east = b.east - a.east,
    north = b.north - a.north,
    norm = Math.hypot(east, north) || 1;
  return {
    east: a.east + east * t + (north / norm) * lane,
    north: a.north + north * t - (east / norm) * lane,
    height: a.height + (b.height - a.height) * t,
    tangentEast: east / norm,
    tangentNorth: north / norm,
    grade: (b.height - a.height) / norm,
  };
}

export function pointInsidePolygon(point: Point2, polygon: Point2[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
