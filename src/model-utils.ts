import {
  BufferGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/** Batch static pieces by shared material, preserving normals and metre-scale UVs. */
export function batchStaticModel(source: Group) {
  source.updateMatrixWorld(true);
  const batches = new Map<MeshStandardMaterial, BufferGeometry[]>();
  source.traverse((object) => {
    if (
      !(object instanceof Mesh) ||
      !(object.material instanceof MeshStandardMaterial)
    )
      return;
    let geometry = object.geometry.clone();
    if (geometry.index) {
      const expanded = geometry.toNonIndexed();
      geometry.dispose();
      geometry = expanded;
    }
    geometry.applyMatrix4(object.matrixWorld);
    // All primitive types have position/normal/uv. Remove unused attributes consistently.
    for (const name of Object.keys(geometry.attributes))
      if (!["position", "normal", "uv"].includes(name))
        geometry.deleteAttribute(name);
    const list = batches.get(object.material) ?? [];
    list.push(geometry);
    batches.set(object.material, list);
  });
  const group = new Group();
  group.name = source.name;
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const indexed = mergeVertices(merged, 0.00001);
      group.add(new Mesh(indexed, material));
      merged.dispose();
    }
    geometries.forEach((g) => g.dispose());
  }
  return group;
}

export async function exportModelUrl(group: Group) {
  const binary = await new GLTFExporter().parseAsync(group, {
    binary: true,
    onlyVisible: true,
  });
  if (!(binary instanceof ArrayBuffer)) throw new Error("Expected binary glTF");
  return URL.createObjectURL(new Blob([binary], { type: "model/gltf-binary" }));
}

export function disposeThreeModel(group: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      if (material instanceof MeshStandardMaterial) materials.add(material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    m.map?.dispose();
    m.normalMap?.dispose();
    m.dispose();
  });
}
