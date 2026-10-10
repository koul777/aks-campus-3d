import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import type { PrunedPlantInstance } from "./pruned-plant-model";
const large = [
  [2, 2.5, 2.25, 0.9, 0, 0, 110],
  [3.18, 2.4, 2.12, 1.02, -0.1, 0.06, 110],
  [4.4, 2.13, 1.94, 1.1, 0.07, -0.05, 100],
  [5.42, 1.75, 1.6, 1.08, -0.04, 0.05, 90],
];
const small = [
  [1.25, 1.7, 1.55, 0.6, 0, 0, 90],
  [2.08, 1.64, 1.46, 0.67, 0.05, -0.04, 80],
  [2.96, 1.38, 1.26, 0.64, -0.05, 0.04, 70],
];
const palette = [
  "#344522",
  "#40532a",
  "#4c6030",
  "#5b6d38",
  "#26381e",
  "#63743f",
].map((value) => new Color(value));

/** Final envelopes include clumps. No measured campus species or leaf scan is asserted. */
export function createClusteredCrown(instance: PrunedPlantInstance) {
  let seed =
    [...instance.id].reduce(
      (value, char) => Math.imul(value, 31) + char.charCodeAt(0),
      137,
    ) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const phase = random() * Math.PI * 2;
  const sx = instance.crownDiameter / (instance.small ? 3.4 : 5),
    sy = instance.height / (instance.small ? 3.6 : 6.5);
  const tiers = (instance.small ? small : large).map(
    ([y, rx, rz, ry, ox, oz, count]) => ({
      y: y * sy,
      rx: rx * sx,
      rz: rz * sx,
      ry: ry * sy,
      ox: ox * sx,
      oz: oz * sx,
      count,
    }),
  );
  const geometries: BufferGeometry[] = [];
  let clusters = 0;
  const colorGeometry = (geometry: BufferGeometry) => {
    const position = geometry.getAttribute("position"),
      colors: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const value = palette[Math.floor(random() * palette.length)].clone();
      colors.push(value.r, value.g, value.b);
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometries.push(
      geometry.index ? geometry.toNonIndexed() : geometry.clone(),
    );
    geometry.dispose();
  };
  for (const [tierIndex, tier] of tiers.entries()) {
    const shell = new SphereGeometry(1, 16, 12),
      position = shell.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const direction = new Vector3().fromBufferAttribute(position, i),
        angle = Math.atan2(direction.z, direction.x);
      const fine =
        0.045 *
        Math.sin(direction.x * 19 + direction.y * 23 + phase) *
        Math.cos(direction.z * 17 - direction.y * 11);
      const macro =
        0.07 *
        Math.sin(angle * (5 + (tierIndex % 3)) + phase + tierIndex * 0.6) *
        Math.sqrt(Math.max(0, 1 - direction.y * direction.y));
      position.setXYZ(
        i,
        tier.ox + direction.x * (tier.rx - 0.13 + fine + macro),
        tier.y + direction.y * (tier.ry - 0.11 + fine),
        tier.oz + direction.z * (tier.rz - 0.13 + fine + macro),
      );
    }
    colorGeometry(shell);
    let accepted = 0;
    for (
      let attempt = 0;
      accepted < tier.count && attempt < tier.count * 30;
      attempt++
    ) {
      const y = 1 - 2 * ((attempt * 0.6180339887498949 + random() * 0.1) % 1),
        angle = attempt * 2.399963229728653 + phase + random() * 0.3;
      if (y < -0.5 && random() < 0.8) continue;
      const horizontal = Math.sqrt(1 - y * y),
        direction = new Vector3(
          Math.cos(angle) * horizontal,
          y,
          Math.sin(angle) * horizontal,
        );
      const surface = new Vector3(
        tier.ox + direction.x * tier.rx,
        tier.y + direction.y * tier.ry,
        tier.oz + direction.z * tier.rz,
      );
      if (
        tiers.some(
          (other, index) =>
            index !== tierIndex &&
            ((surface.x - other.ox) / other.rx) ** 2 +
              ((surface.y - other.y) / other.ry) ** 2 +
              ((surface.z - other.oz) / other.rz) ** 2 <
              0.98,
        )
      )
        continue;
      // Rejection weighting compensates for unequal ellipsoid surface area.
      const areaWeight =
        Math.sqrt(
          (direction.x / tier.rx) ** 2 +
            (direction.y / tier.ry) ** 2 +
            (direction.z / tier.rz) ** 2,
        ) * Math.min(tier.rx, tier.ry, tier.rz);
      if (random() > areaWeight) continue;
      const radius =
        random() < 0.12 ? 0.22 + random() * 0.03 : 0.14 + random() * 0.05;
      const tuft = new IcosahedronGeometry(radius, 0),
        tuftPositions = tuft.getAttribute("position");
      const center = surface.addScaledVector(
        direction,
        -radius * (0.35 + random() * 0.3),
      );
      const anisotropy = [
        0.75 + random() * 0.4,
        0.75 + random() * 0.4,
        0.75 + random() * 0.4,
      ];
      for (let i = 0; i < tuftPositions.count; i++) {
        const rough = 0.9 + random() * 0.2;
        tuftPositions.setXYZ(
          i,
          center.x + tuftPositions.getX(i) * anisotropy[0] * rough,
          center.y + tuftPositions.getY(i) * anisotropy[1] * rough,
          center.z + tuftPositions.getZ(i) * anisotropy[2] * rough,
        );
      }
      colorGeometry(tuft);
      accepted++;
      clusters++;
    }
  }
  // Normalize AFTER clumps: final width/depth/height remain the existing candidates.
  const minimum = new Vector3(Infinity, Infinity, Infinity),
    maximum = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    minimum.min(geometry.boundingBox!.min);
    maximum.max(geometry.boundingBox!.max);
  }
  const targetDepth =
    instance.crownDiameter * (instance.small ? 3.1 / 3.4 : 4.5 / 5);
  const scaleX = instance.crownDiameter / (maximum.x - minimum.x),
    scaleZ = targetDepth / (maximum.z - minimum.z),
    scaleY = instance.height / maximum.y;
  for (const geometry of geometries) {
    geometry.translate(
      -(minimum.x + maximum.x) / 2,
      0,
      -(minimum.z + maximum.z) / 2,
    );
    geometry.scale(scaleX, scaleY, scaleZ);
    geometry.translate(...instance.translation);
    geometry.computeVertexNormals();
  }
  const triangles = geometries.reduce(
    (sum, geometry) => sum + geometry.getAttribute("position").count / 3,
    0,
  );
  return { geometries, clusters, triangles };
}
