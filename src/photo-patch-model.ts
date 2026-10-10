import {
  BufferGeometry,
  BufferAttribute,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  TextureLoader,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { PhotoPatch } from "./data/photo-patches";

/** Projective map from unit receiver coordinates to original photo pixels. */
export function solvePhotoHomography(
  corners: PhotoPatch["sourcePixels"],
): number[] {
  const rows: number[][] = [];
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].forEach(([u, v], index) => {
    const [x, y] = corners[index];
    rows.push(
      [u, v, 1, 0, 0, 0, -u * x, -v * x, x],
      [0, 0, 0, u, v, 1, -u * y, -v * y, y],
    );
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++)
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column]))
        pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    if (Math.abs(divisor) < 1e-12)
      throw new Error("Singular photo patch homography");
    rows[column] = rows[column].map((value) => value / divisor);
    for (let row = 0; row < 8; row++)
      if (row !== column) {
        const factor = rows[row][column];
        rows[row] = rows[row].map(
          (value, index) => value - factor * rows[column][index],
        );
      }
  }
  return rows.map((row) => row[8]);
}

export async function createPhotoPatchMesh(
  patch: PhotoPatch,
  baseHeight: number,
): Promise<Mesh> {
  const map = await new TextureLoader().loadAsync(patch.source.imageUrl);
  map.colorSpace = SRGBColorSpace;
  // Official exporter consumes this hint; retain JPEG encoding rather than a full-photo PNG.
  // Source file bytes stay immutable. Exporter still handles its required UV/image flip.
  map.userData.mimeType = "image/jpeg";
  const h = solvePhotoHomography(patch.sourcePixels);
  const corners = patch.geometryCorners.map(
    ([e, n, y]) => new Vector3(e, baseHeight + y, -n),
  );
  const outward = new Vector3(
    patch.side === "east" ? 1 : patch.side === "west" ? -1 : 0,
    0,
    patch.side === "south" ? 1 : patch.side === "north" ? -1 : 0,
  );
  const positions: number[] = [],
    uv: number[] = [];
  const point = (u: number, v: number) =>
    corners[0]
      .clone()
      .lerp(corners[1], u)
      .lerp(corners[3].clone().lerp(corners[2], u), v)
      .addScaledVector(outward, patch.normalOffsetMetres);
  const append = (u: number, v: number) => {
    positions.push(...point(u, v).toArray());
    const denominator = h[6] * u + h[7] * v + 1;
    uv.push(
      (h[0] * u + h[1] * v + h[2]) / denominator / patch.source.width,
      1 - (h[3] * u + h[4] * v + h[5]) / denominator / patch.source.height,
    );
  };
  // Dense tessellation preserves projective interior UV rather than only four corners.
  const segments = 32;
  for (let y = 0; y < segments; y++)
    for (let x = 0; x < segments; x++) {
      const a = x / segments,
        b = y / segments,
        c = (x + 1) / segments,
        d = (y + 1) / segments;
      const normal = point(c, b)
        .sub(point(a, b))
        .cross(point(c, d).sub(point(a, b)));
      const order =
        normal.dot(outward) > 0
          ? [
              [a, b],
              [c, b],
              [c, d],
              [a, b],
              [c, d],
              [a, d],
            ]
          : [
              [a, b],
              [c, d],
              [c, b],
              [a, b],
              [a, d],
              [c, d],
            ];
      for (const [u, v] of order) append(u, v);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ map }));
  mesh.name = `photo-patch:${patch.id}`;
  return mesh;
}

/** Subtract the receiver rectangle only from coplanar triangles, preserving all attributes. */
export function subtractPhotoRegion(
  geometry: BufferGeometry,
  patch: PhotoPatch,
  baseHeight: number,
): BufferGeometry {
  const attributes = Object.entries(geometry.attributes) as [
    string,
    BufferAttribute,
  ][];
  const offsets = new Map<string, number>();
  let size = 0;
  for (const [name, attribute] of attributes) {
    offsets.set(name, size);
    size += attribute.itemSize;
  }
  const p = offsets.get("position")!;
  const horizontal = patch.side === "east" || patch.side === "west";
  const horizontalIndex = p + (horizontal ? 2 : 0),
    heightIndex = p + 1,
    planeIndex = p + (horizontal ? 0 : 2);
  const corners = patch.geometryCorners.map(([e, n, y]) => [
    e,
    baseHeight + y,
    -n,
  ]);
  const minimumH = Math.min(...corners.map((v) => v[horizontal ? 2 : 0])),
    maximumH = Math.max(...corners.map((v) => v[horizontal ? 2 : 0]));
  const minimumY = Math.min(...corners.map((v) => v[1])),
    maximumY = Math.max(...corners.map((v) => v[1]));
  const plane = corners[0][horizontal ? 0 : 2];
  const outputs = attributes.map(() => [] as number[]);
  const clip = (
    polygon: number[][],
    axis: number,
    bound: number,
    less: boolean,
  ) => {
    const result: number[][] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const insideA = less ? a[axis] <= bound : a[axis] >= bound,
        insideB = less ? b[axis] <= bound : b[axis] >= bound;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = (bound - a[axis]) / (b[axis] - a[axis]);
        result.push(a.map((value, index) => value + (b[index] - value) * t));
      }
    }
    return result;
  };
  const append = (polygon: number[][]) => {
    for (let i = 1; i + 1 < polygon.length; i++)
      for (const vertex of [polygon[0], polygon[i], polygon[i + 1]]) {
        attributes.forEach(([name, attribute], index) => {
          const offset = offsets.get(name)!;
          outputs[index].push(
            ...vertex.slice(offset, offset + attribute.itemSize),
          );
        });
      }
  };
  const count = geometry.getAttribute("position").count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map((delta) =>
      attributes.flatMap(([, attribute]) =>
        Array.from({ length: attribute.itemSize }, (_, component) =>
          attribute.getComponent(i + delta, component),
        ),
      ),
    );
    if (triangle.some((v) => Math.abs(v[planeIndex] - plane) > 0.21)) {
      append(triangle);
      continue;
    }
    let interior = triangle;
    for (const [axis, bound, less] of [
      [horizontalIndex, minimumH, true],
      [horizontalIndex, maximumH, false],
      [heightIndex, minimumY, true],
      [heightIndex, maximumY, false],
    ] as [number, number, boolean][]) {
      if (!interior.length) break;
      append(clip(interior, axis, bound, less));
      interior = clip(interior, axis, bound, !less);
    }
  }
  const result = new BufferGeometry();
  attributes.forEach(([name, attribute], index) =>
    result.setAttribute(
      name,
      new Float32BufferAttribute(outputs[index], attribute.itemSize),
    ),
  );
  return result;
}
