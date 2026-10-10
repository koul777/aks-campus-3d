import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  Color,
  Quaternion,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { createClusteredCrown } from "./clustered-crown";

export type PrunedPlantInstance = {
  id: string;
  translation: [number, number, number];
  height: number;
  crownDiameter: number;
  small: boolean;
};
const largeTiers = [
  [2, 2.5, 2.25, 0.9],
  [3.25, 2.2, 2, 1],
  [4.5, 1.85, 1.65, 1],
  [5.55, 1.25, 1.12, 0.95],
];
const smallTiers = [
  [1.35, 1.7, 1.55, 0.55],
  [2.2, 1.52, 1.39, 0.62],
  [3, 1.16, 1.04, 0.6],
];

/** Four photo-supported planting candidates, not scanned campus trees or verified species. */
export async function createPrunedPlantGlb(
  instances: readonly PrunedPlantInstance[],
  clustered = false,
): Promise<string | undefined> {
  if (!instances.length) return undefined;
  const foliage: BufferGeometry[] = [],
    wood: BufferGeometry[] = [];
  const crownMetadata: { id: string; clusters: number; triangles: number }[] =
    [];
  for (const instance of instances) {
    if (
      ![...instance.translation, instance.height, instance.crownDiameter].every(
        Number.isFinite,
      ) ||
      instance.height <= 0 ||
      instance.crownDiameter <= 0
    )
      throw new Error("Invalid pruned plant dimensions");
    const seed =
      [...instance.id].reduce(
        (value, char) => value * 31 + char.charCodeAt(0),
        0,
      ) >>> 0;
    const phase = ((seed % 997) / 997) * Math.PI * 2;
    const verticalScale = instance.height / (instance.small ? 3.6 : 6.5),
      horizontalScale = instance.crownDiameter / (instance.small ? 3.4 : 5);
    const tiers = instance.small ? smallTiers : largeTiers;
    if (clustered) {
      const crown = createClusteredCrown(instance);
      foliage.push(...crown.geometries);
      crownMetadata.push({
        id: instance.id,
        clusters: crown.clusters,
        triangles: crown.triangles,
      });
    } else
      for (const [tier, [height, rx, rz, ry]] of tiers.entries()) {
        const geometry = new SphereGeometry(1, 24, 16),
          position = geometry.getAttribute("position"),
          colors: number[] = [];
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i),
            y = position.getY(i),
            z = position.getZ(i);
          const angle = Math.atan2(z, x),
            latitude = Math.asin(Math.max(-1, Math.min(1, y)));
          const lobes =
            1 +
            0.035 *
              Math.sin(angle * 5 + phase + tier * 0.8) *
              Math.cos(latitude) +
            0.012 * Math.sin(angle * 11 + latitude * 13 + phase) +
            0.006 * Math.cos(angle * 23 - latitude * 19);
          position.setXYZ(
            i,
            instance.translation[0] + x * rx * horizontalScale * lobes,
            instance.translation[1] + (height + y * ry * lobes) * verticalScale,
            instance.translation[2] + z * rz * horizontalScale * lobes,
          );
          const variation =
            0.5 + 0.5 * Math.sin(angle * 13 + latitude * 17 + phase);
          const color = new Color("#354722")
            .lerp(new Color("#5a6b31"), 0.2 + variation * 0.35)
            .multiplyScalar(y < -0.2 ? 0.78 : 1);
          colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        foliage.push(geometry.toNonIndexed());
        geometry.dispose();
      }
    const trunkHeight = instance.height * 0.72,
      radius = (instance.small ? 0.15 : 0.23) * horizontalScale;
    const trunk = new CylinderGeometry(radius * 0.65, radius, trunkHeight, 10);
    trunk.translate(
      instance.translation[0],
      instance.translation[1] + trunkHeight / 2,
      instance.translation[2],
    );
    wood.push(trunk.toNonIndexed());
    trunk.dispose();
    for (let tier = 0; tier < tiers.length - 1; tier++)
      for (let branch = 0; branch < 3; branch++) {
        const angle = phase + (branch * Math.PI * 2) / 3 + tier * 0.6;
        const start = new Vector3(...instance.translation).add(
          new Vector3(0, (tiers[tier][0] - 0.45) * verticalScale, 0),
        );
        const end = new Vector3(...instance.translation).add(
          new Vector3(
            Math.cos(angle) * tiers[tier][1] * horizontalScale * 0.65,
            tiers[tier][0] * verticalScale,
            Math.sin(angle) * tiers[tier][2] * horizontalScale * 0.65,
          ),
        );
        const direction = end.clone().sub(start);
        const geometry = new CylinderGeometry(
          radius * 0.25,
          radius * 0.4,
          direction.length(),
          7,
        );
        geometry.applyQuaternion(
          new Quaternion().setFromUnitVectors(
            new Vector3(0, 1, 0),
            direction.normalize(),
          ),
        );
        geometry.translate(
          ...(start.add(end).multiplyScalar(0.5).toArray() as [
            number,
            number,
            number,
          ]),
        );
        wood.push(geometry.toNonIndexed());
        geometry.dispose();
      }
  }
  const group = new Group();
  group.name = "photo-interpreted-main-pruned-trial";
  group.userData = {
    variant: clustered ? "clustered-v2" : "smooth-v1",
    crownMetadata,
    status:
      "photo-supported-geometry-and-position-estimates-species-unverified",
    sourceContract: clustered
      ? "references/research-20261010/foliage-source/tier-crown-contract-v2.json"
      : "references/research-20261010/foliage-source/tier-crown-contract.json",
    instances: instances.map((instance) => ({
      ...instance,
      tierCount: instance.small ? 3 : 4,
    })),
  };
  group.userData.totalTriangles = [...foliage, ...wood].reduce(
    (sum, geometry) => sum + geometry.getAttribute("position").count / 3,
    0,
  );
  for (const [geometries, material] of [
    [
      foliage,
      new MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.95,
      }),
    ],
    [wood, new MeshStandardMaterial({ color: "#605343", roughness: 0.95 })],
  ] as const) {
    const merged = mergeGeometries([...geometries], false);
    geometries.forEach((geometry) => geometry.dispose());
    if (merged) group.add(new Mesh(merged, material));
  }
  const result = await new GLTFExporter().parseAsync(group, { binary: true });
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      (object.material as MeshStandardMaterial).dispose();
    }
  });
  if (!(result instanceof ArrayBuffer))
    throw new Error("Pruned plant export failed");
  return URL.createObjectURL(new Blob([result], { type: "model/gltf-binary" }));
}
