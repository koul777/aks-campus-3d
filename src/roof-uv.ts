import { Vector3 } from "three";
export type RoofFrame = { origin: Vector3; u: Vector3; v: Vector3 };
export function createRoofFrames(
  points: readonly [number, number][],
  height: number,
  vertices: readonly number[],
) {
  const center = new Vector3(
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    height,
    -points.reduce((sum, p) => sum + p[1], 0) / points.length,
  );
  const edges = points.map((point, index) => {
    const a = new Vector3(point[0], height, -point[1]),
      next = points[(index + 1) % points.length],
      b = new Vector3(next[0], height, -next[1]);
    const u = b.clone().sub(a).normalize();
    let outward = new Vector3(-u.z, 0, u.x);
    if (outward.dot(a.clone().add(b).multiplyScalar(0.5).sub(center)) < 0)
      outward.negate();
    return { origin: a, u, outward, normal: new Vector3() };
  });
  const faceIndices: number[] = [];
  for (let i = 0; i < vertices.length; i += 9) {
    const a = new Vector3(
        ...(vertices.slice(i, i + 3) as [number, number, number]),
      ),
      b = new Vector3(
        ...(vertices.slice(i + 3, i + 6) as [number, number, number]),
      ),
      c = new Vector3(
        ...(vertices.slice(i + 6, i + 9) as [number, number, number]),
      );
    const normal = b.sub(a).cross(c.sub(a));
    if (normal.y < 0) normal.negate();
    const downhill = new Vector3(normal.x, 0, normal.z).normalize();
    let index = 0;
    for (let j = 1; j < edges.length; j++)
      if (edges[j].outward.dot(downhill) > edges[index].outward.dot(downhill))
        index = j;
    edges[index].normal.add(normal);
    faceIndices.push(index, index, index);
  }
  const frames: RoofFrame[] = edges.map((edge) => {
    const normal =
      edge.normal.lengthSq() > 1e-12
        ? edge.normal.normalize()
        : new Vector3(0, 1, 0);
    const v = normal.clone().cross(edge.u).normalize();
    if (v.dot(edge.outward) > 0) v.negate();
    return { origin: edge.origin, u: edge.u, v };
  });
  return { frames, faceIndices };
}
export function roofMetricUv(
  point: Vector3,
  frame: RoofFrame,
): [number, number] {
  const relative = point.clone().sub(frame.origin);
  return [relative.dot(frame.u) / 0.33, relative.dot(frame.v) / 0.34];
}
