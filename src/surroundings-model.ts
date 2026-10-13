import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  Vector2,
} from "three";
import { getVisualGroundElevation } from "./terrain";
import { toLocal, type SurroundingBuilding } from "./data/surroundings";
import {
  batchStaticModel,
  disposeThreeModel,
  exportModelUrl,
} from "./model-utils";

export async function createSurroundingsGlb(
  buildings: SurroundingBuilding[],
  originHeight: number,
  cancelled: () => boolean,
) {
  const group = new Group();
  group.name = "OSM 주변 건물 · 높이와 입면 근사";
  const palettes = ["#c8c1b2", "#dedbd2", "#b9aea0", "#d7cbb9", "#a99280"];
  const walls = palettes.map(
    (color) => new MeshStandardMaterial({ color, roughness: 0.93 }),
  );
  const stone = new MeshStandardMaterial({ color: "#98988e", roughness: 0.98 });
  const trim = new MeshStandardMaterial({ color: "#e3dfd5", roughness: 0.82 });
  const roof = new MeshStandardMaterial({ color: "#747e7b", roughness: 0.98 });
  const glass = new MeshStandardMaterial({
    color: "#4c6873",
    roughness: 0.3,
    metalness: 0.15,
  });
  const shadow = new MeshStandardMaterial({
    color: "#35444a",
    roughness: 0.86,
  });
  const box = (
    parent: Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: MeshStandardMaterial,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const pane = (
    parent: Group,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    material: MeshStandardMaterial,
  ) => {
    const mesh = new Mesh(new PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
  };
  const diagnostics = [];
  for (const building of buildings) {
    if (cancelled()) break;
    const ground = await Promise.all(
      building.footprint.map(([lon, lat]) =>
        getVisualGroundElevation(lon, lat),
      ),
    );
    const base = Math.max(...ground) - originHeight + 0.05;
    const bottom = Math.min(...ground) - originHeight - 0.6;
    const points = building.footprint.map(toLocal);
    const shape = new Shape(points.map(([e, n]) => new Vector2(e, n)));
    const extrude = (
      depth: number,
      y: number,
      material: MeshStandardMaterial,
    ) => {
      const geometry = new ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, y, 0);
      group.add(new Mesh(geometry, material));
    };
    const seed = [...building.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const wall = walls[building.kind === "apartment" ? 1 : seed % walls.length];
    extrude(base - bottom + 0.42, bottom, stone);
    extrude(building.height, base, wall);
    extrude(0.16, base + building.height, roof);
    const signedArea = points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0);
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      const dx = b[0] - a[0],
        dn = b[1] - a[1],
        length = Math.hypot(dx, dn);
      if (length < 0.4) continue;
      const frame = new Group();
      // +Z in this local façade frame is outward; the footprint's winding determines the side.
      const nx = (signedArea > 0 ? dn : -dn) / length,
        nn = (signedArea > 0 ? -dx : dx) / length;
      frame.position.set((a[0] + b[0]) / 2, base, -(a[1] + b[1]) / 2);
      frame.rotation.y = Math.atan2(nx, -nn);
      group.add(frame);
      box(frame, length, 0.46, 0.2, 0, building.height + 0.2, 0, trim);
      box(frame, length, 0.16, 0.16, 0, 0.45, 0.06, trim);
      const bays = Math.floor(
        (length - 0.7) / (building.kind === "apartment" ? 3.6 : 3.1),
      );
      if (bays < 1) continue;
      const pitch = (length - 0.8) / bays;
      const width = Math.min(1.9, pitch * 0.62),
        height = 1.55;
      for (let f = 0; f < building.floors; f++) {
        const y = ((building.height - 0.4) / building.floors) * f + 1.5;
        for (let bay = 0; bay < bays; bay++) {
          const x = -length / 2 + 0.4 + pitch * (bay + 0.5);
          // Only the visible façade surfaces need triangles; sills and balconies
          // retain their depth. Hidden back/side faces of window boxes are omitted.
          pane(frame, width + 0.17, height + 0.17, x, y, 0.135, trim);
          pane(frame, width, height, x, y, 0.21, shadow);
          pane(frame, width - 0.1, height - 0.1, x, y, 0.235, glass);
          pane(frame, 0.055, height, x, y, 0.265, trim);
          box(
            frame,
            width + 0.28,
            0.09,
            0.32,
            x,
            y - height / 2 - 0.05,
            0.18,
            trim,
          );
          if (
            building.kind === "apartment" &&
            f > 0 &&
            length > 15 &&
            bay % 3 === 1
          ) {
            box(frame, width + 0.4, 0.12, 0.8, x, y - 0.85, 0.4, trim);
            box(frame, width + 0.4, 0.1, 0.08, x, y - 0.17, 0.78, trim);
            for (let rail = 0; rail < 6; rail++)
              box(
                frame,
                0.04,
                0.7,
                0.04,
                x - width / 2 + (rail * width) / 5,
                y - 0.5,
                0.78,
                stone,
              );
          }
        }
      }
    }
    diagnostics.push({
      id: building.id,
      height: building.height,
      heightSource: building.heightSource,
      groundMin: Math.min(...ground),
      groundMax: Math.max(...ground),
    });
  }
  const batch = batchStaticModel(group);
  const url = await exportModelUrl(batch);
  const meshes = batch.children.length;
  disposeThreeModel(group);
  disposeThreeModel(batch);
  return { url, diagnostics, meshes };
}
