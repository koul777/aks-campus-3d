import {
  AnimationClip,
  Bone,
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  SphereGeometry,
  SRGBColorSpace,
  VectorKeyframeTrack,
  Vector3,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Skeleton,
  SkinnedMesh,
  BufferGeometry,
  Scene,
  type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  batchStaticModel,
  disposeThreeModel,
  exportModelUrl,
} from "./model-utils";

export type ActorKind = "person" | "car" | "bus";
export type ActorAsset = {
  kind: ActorKind;
  url: string;
  variant: number;
  length: number;
};
const mat = (color: string, roughness = 0.8, metalness = 0) =>
  new MeshStandardMaterial({ color, roughness, metalness });
function mesh(
  parent: Object3D,
  geometry: Mesh["geometry"],
  material: MeshStandardMaterial,
  x = 0,
  y = 0,
  z = 0,
) {
  const object = new Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

/** Rigid skin weights retain the articulated silhouette while batching by material. */
function skinPerson(group: Group) {
  group.updateMatrixWorld(true);
  const bones: Bone[] = [],
    meshes: Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof Bone) bones.push(object);
    if (object instanceof Mesh) meshes.push(object);
  });
  const batches = new Map<MeshStandardMaterial, BufferGeometry[]>();
  for (const object of meshes) {
    let ancestor = object.parent;
    while (ancestor && !(ancestor instanceof Bone)) ancestor = ancestor.parent;
    if (!ancestor) throw new Error("Pedestrian part has no bone");
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    geometry.deleteAttribute("uv"); // Solid-colour clothing does not sample textures.
    const count = geometry.getAttribute("position").count,
      indices = new Uint16Array(count * 4),
      weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      indices[i * 4] = bones.indexOf(ancestor as Bone);
      weights[i * 4] = 1;
    }
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
    const material = object.material as MeshStandardMaterial;
    const list = batches.get(material) ?? [];
    list.push(geometry);
    batches.set(material, list);
  }
  const materials: MeshStandardMaterial[] = [],
    parts: BufferGeometry[] = [];
  for (const [material, geometries] of batches) {
    materials.push(material);
    parts.push(mergeGeometries(geometries)!);
    geometries.forEach((g) => g.dispose());
  }
  const combined = mergeGeometries(parts, true)!;
  parts.forEach((g) => g.dispose());
  const indexed = mergeVertices(combined, 0.00001);
  combined.dispose();
  const skinned = new SkinnedMesh(indexed, materials);
  skinned.name = "walker_skin";
  group.add(skinned);
  skinned.bind(new Skeleton(bones));
  for (const object of meshes) {
    object.removeFromParent();
    object.geometry.dispose();
  }
}

async function personModel(variant: number): Promise<ActorAsset> {
  const group = new Group();
  group.name = `campus-walker-${variant}`;
  const skins = ["#d4ab88", "#bd8d69", "#e1bc9d", "#cb9877"];
  const shirts = ["#b68859", "#31566c", "#88957c", "#9a5e58"];
  const trousers = ["#34414b", "#34414b", "#4b4844", "#283d4b"];
  const skin = mat(skins[variant % 4]),
    shirt = mat(shirts[variant % 4]),
    pants = mat(trousers[variant % 4]);
  const shoe = mat("#343735"),
    hair = mat(variant % 2 ? "#302c28" : "#443930");
  const hips = new Bone();
  hips.name = "walk_root";
  hips.position.y = 0.875;
  group.add(hips);
  mesh(hips, new CapsuleGeometry(0.15, 0.28, 3, 8), shirt, 0, 0.3, 0);
  mesh(hips, new SphereGeometry(0.17, 10, 7), shirt, 0, 0.45, 0).scale.set(
    1.32,
    0.58,
    0.85,
  );
  mesh(hips, new BoxGeometry(0.29, 0.17, 0.22), pants, 0, 0.035, 0);
  mesh(hips, new CylinderGeometry(0.067, 0.075, 0.1, 8), skin, 0, 0.57, 0);
  mesh(hips, new SphereGeometry(0.13, 10, 8), skin, 0, 0.72, 0.005).scale.set(
    0.83,
    1.18,
    0.91,
  );
  mesh(
    hips,
    new SphereGeometry(0.134, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.54),
    hair,
    0,
    0.74,
    -0.007,
  ).scale.set(0.88, 1.16, 0.96);
  mesh(hips, new SphereGeometry(0.035, 6, 5), skin, 0, 0.715, 0.124).scale.set(
    0.65,
    0.6,
    0.65,
  );
  if (variant % 2 === 0) {
    const bag = mat(variant === 0 ? "#4e615b" : "#7c644a");
    mesh(
      hips,
      new RoundedBoxGeometry(0.23, 0.32, 0.12, 2, 0.04),
      bag,
      0,
      0.3,
      -0.17,
    );
    for (const x of [-0.09, 0.09])
      mesh(hips, new BoxGeometry(0.026, 0.35, 0.018), bag, x, 0.3, 0.137);
  }
  const joints: { name: string; kind: string; side: number }[] = [];
  for (const side of [-1, 1]) {
    const leg = new Bone();
    leg.name = side < 0 ? "hip_left" : "hip_right";
    leg.position.set(side * 0.085, 0, 0);
    hips.add(leg);
    mesh(leg, new CapsuleGeometry(0.068, 0.29, 3, 7), pants, 0, -0.205, 0);
    const knee = new Bone();
    knee.name = side < 0 ? "knee_left" : "knee_right";
    knee.position.y = -0.42;
    leg.add(knee);
    mesh(knee, new CapsuleGeometry(0.052, 0.28, 3, 7), pants, 0, -0.185, 0);
    mesh(
      knee,
      new RoundedBoxGeometry(0.12, 0.1, 0.25, 2, 0.035),
      shoe,
      0,
      -0.395,
      0.06,
    );
    const arm = new Bone();
    arm.name = side < 0 ? "shoulder_left" : "shoulder_right";
    arm.position.set(side * 0.2, 0.46, 0);
    hips.add(arm);
    mesh(
      arm,
      new CapsuleGeometry(0.056, 0.19, 3, 7),
      shirt,
      side * 0.022,
      -0.14,
      0,
    );
    const elbow = new Bone();
    elbow.name = side < 0 ? "elbow_left" : "elbow_right";
    elbow.position.set(side * 0.035, -0.28, 0);
    elbow.rotation.x = -0.18;
    arm.add(elbow);
    mesh(elbow, new CapsuleGeometry(0.04, 0.19, 3, 7), skin, 0, -0.12, 0);
    mesh(elbow, new SphereGeometry(0.052, 7, 5), skin, 0, -0.25, 0);
    joints.push(
      { name: leg.name, kind: "hip", side },
      { name: knee.name, kind: "knee", side },
      { name: arm.name, kind: "arm", side },
    );
  }
  const samples = 32,
    duration = 1.18,
    times = Array.from(
      { length: samples + 1 },
      (_, i) => (i / samples) * duration,
    );
  const tracks = [];
  for (const joint of joints) {
    const values: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const phase =
        (i / samples) * Math.PI * 2 + (joint.side < 0 ? 0 : Math.PI);
      // Foot swings forward with a flexed knee; opposite arm balances the stride.
      const angle =
        joint.kind === "hip"
          ? -Math.sin(phase) * 0.4
          : joint.kind === "knee"
            ? Math.max(0, Math.cos(phase)) * 0.68 + 0.045
            : Math.sin(phase) * 0.31 - 0.08;
      const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle);
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(
      new QuaternionKeyframeTrack(`${joint.name}.quaternion`, times, values),
    );
  }
  // Keep the supporting shoe on the ground throughout the stride. This follows
  // the actual hip/knee angles and shoe sole corners instead of an arbitrary bob.
  tracks.push(
    new VectorKeyframeTrack(
      "walk_root.position",
      times,
      times.flatMap((_, i) => {
        let lowest = 0;
        for (const phase of [
          (i / samples) * Math.PI * 2,
          (i / samples) * Math.PI * 2 + Math.PI,
        ]) {
          const hip = -Math.sin(phase) * 0.4,
            knee = Math.max(0, Math.cos(phase)) * 0.68 + 0.045;
          for (const z of [-0.065, 0.185])
            lowest = Math.min(
              lowest,
              -0.42 * Math.cos(hip) -
                0.445 * Math.cos(hip + knee) -
                z * Math.sin(hip + knee),
            );
        }
        return [0, -lowest + 0.014, 0];
      }),
    ),
  );
  const animation = new AnimationClip("walk", duration, tracks);
  skinPerson(group);
  // Export the skeleton and skin as scene roots; no ignored parent transform.
  const exportScene = new Scene();
  exportScene.add(...group.children);
  const binary = await new GLTFExporter().parseAsync(exportScene, {
    binary: true,
    animations: [animation],
  });
  if (!(binary instanceof ArrayBuffer))
    throw new Error("Pedestrian GLB export failed");
  const url = URL.createObjectURL(
    new Blob([binary], { type: "model/gltf-binary" }),
  );
  disposeThreeModel(exportScene);
  return { kind: "person", url, variant, length: 0.5 };
}

function signMaterial(text: string, bg: string, fg: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.font = 'bold 72px "Malgun Gothic",sans-serif';
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 68);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return new MeshStandardMaterial({ map: texture, roughness: 0.6 });
}

async function vehicleModel(
  kind: "car" | "bus",
  variant: number,
): Promise<ActorAsset> {
  const bus = kind === "bus",
    group = new Group();
  group.name = bus ? "red-express-bus-simulation" : `campus-car-${variant}`;
  const body = mat(
    bus ? "#b62f35" : ["#eeeae1", "#3f5868", "#353b43", "#b2b8b5"][variant % 4],
    0.3,
    0.24,
  );
  const glass = mat("#283e49", 0.16, 0.3),
    rubber = mat("#242729", 0.95),
    chrome = mat("#b9c0c0", 0.3, 0.6),
    dark = mat("#30373b");
  const white = mat("#edece2", 0.5),
    light = mat("#fff5cb", 0.3),
    rearLight = mat("#ba2526", 0.3);
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: MeshStandardMaterial,
    r = 0,
  ) =>
    mesh(
      group,
      r ? new RoundedBoxGeometry(w, h, d, 2, r) : new BoxGeometry(w, h, d),
      material,
      x,
      y,
      z,
    );
  const length = bus ? 11.8 : 4.5,
    width = bus ? 2.48 : 1.82;
  if (bus) {
    box(width, 2.58, length, 0, 1.92, 0, body, 0.16);
    box(width + 0.012, 0.38, length - 0.3, 0, 1.05, 0, white);
    box(width - 0.17, 0.24, length - 0.4, 0, 3.25, 0, white, 0.08);
    box(width - 0.22, 1.28, 0.035, 0, 2.38, length / 2 + 0.013, glass);
    box(width - 0.38, 1.1, 0.035, 0, 2.38, -length / 2 - 0.013, glass);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++)
        box(
          0.035,
          1.06,
          1.11,
          side * (width / 2 + 0.018),
          2.52,
          -4.7 + i * 1.3,
          glass,
        );
      box(0.04, 0.035, 10.6, side * (width / 2 + 0.025), 2.62, 0, chrome);
      const livery = signMaterial("광역버스", "#b62f35", "#ffffff");
      const panel = box(
        0.04,
        0.46,
        2.25,
        side * (width / 2 + 0.03),
        1.4,
        -0.7,
        livery,
      );
      // The box material maps the lettering consistently on both broad sides.
      panel.name = "simulation-bus-livery";
      box(0.19, 0.3, 0.22, side * (width / 2 + 0.19), 2.45, 5.45, dark, 0.04);
      box(0.055, 1.78, 1.01, side * (width / 2 + 0.038), 1.67, 3.78, glass);
      box(0.065, 1.82, 0.045, side * (width / 2 + 0.054), 1.67, 3.78, chrome);
    }
    const display = signMaterial("가상 운행", "#192622", "#d9e0a6");
    box(1.74, 0.31, 0.04, 0, 3.0, length / 2 + 0.026, display);
    box(1.52, 0.06, 0.04, 0, 1.5, length / 2 + 0.035, chrome);
    box(width - 0.18, 0.25, 0.1, 0, 0.82, length / 2 + 0.025, dark, 0.04);
    box(1.15, 0.15, 1.55, 0, 3.42, -0.7, chrome, 0.04);
  } else {
    box(width, 0.64, length, 0, 0.77, 0, body, 0.18);
    const corners = [
      [-0.81, 1.02, -1.55],
      [0.81, 1.02, -1.55],
      [0.81, 1.02, 1.23],
      [-0.81, 1.02, 1.23],
      [-0.66, 1.54, -0.71],
      [0.66, 1.54, -0.71],
      [0.66, 1.54, 0.73],
      [-0.66, 1.54, 0.73],
    ];
    const shell = new BufferGeometry();
    shell.setAttribute(
      "position",
      new Float32BufferAttribute(corners.flat(), 3),
    );
    shell.setIndex([
      0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6, 2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4, 4,
      6, 5, 4, 7, 6, 3, 1, 2, 3, 0, 1,
    ]);
    const cabin = shell.toNonIndexed();
    cabin.computeVertexNormals();
    shell.dispose();
    mesh(group, cabin, glass);
    box(1.38, 0.11, 1.55, 0, 1.565, 0.01, body, 0.04);
    const pillar = (a: number[], b: number[]) => {
      const from = new Vector3(...a),
        to = new Vector3(...b),
        direction = to.clone().sub(from);
      const beam = mesh(
        group,
        new BoxGeometry(0.065, direction.length(), 0.065),
        body,
      );
      beam.position.copy(from.add(to).multiplyScalar(0.5));
      beam.quaternion.setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      );
    };
    for (const [a, b] of [
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ])
      pillar(corners[a], corners[b]);
    for (const side of [-1, 1]) {
      pillar([side * 0.81, 1.02, -0.08], [side * 0.66, 1.54, -0.08]);
      box(0.065, 0.045, 2.7, side * 0.815, 1.025, -0.16, chrome);
      box(0.19, 0.13, 0.29, side * 0.96, 1.21, 0.78, body, 0.04);
      box(0.03, 0.035, 0.18, side * 0.921, 0.91, -0.35, chrome);
    }
    box(1.7, 0.1, 0.09, 0, 0.57, length / 2 + 0.012, dark);
    box(0.72, 0.18, 0.045, 0, 0.79, length / 2 + 0.08, dark);
  }
  for (const side of [-1, 1]) {
    box(
      bus ? 0.33 : 0.42,
      0.15,
      0.07,
      side * (width / 2 - 0.3),
      bus ? 1.08 : 0.86,
      length / 2 + 0.07,
      light,
      0.02,
    );
    box(
      bus ? 0.2 : 0.4,
      bus ? 0.4 : 0.13,
      0.055,
      side * (width / 2 - 0.25),
      bus ? 1.24 : 0.88,
      -length / 2 - 0.07,
      rearLight,
      0.02,
    );
    for (const z of bus ? [-3.65, 3.77] : [-1.37, 1.36]) {
      const radius = bus ? 0.5 : 0.34;
      const wheel = mesh(
        group,
        new CylinderGeometry(radius, radius, bus ? 0.3 : 0.2, 16),
        rubber,
        side * (width / 2 - 0.06),
        radius,
        z,
      );
      wheel.rotation.z = Math.PI / 2;
      const hub = mesh(
        group,
        new CylinderGeometry(radius * 0.54, radius * 0.54, 0.025, 10),
        chrome,
        side * (width / 2 + (bus ? 0.102 : 0.052)),
        radius,
        z,
      );
      hub.rotation.z = Math.PI / 2;
    }
  }
  const plate = signMaterial("AKS 3D", "#eeeedd", "#283b35");
  box(
    bus ? 0.55 : 0.45,
    0.12,
    0.035,
    0,
    bus ? 0.89 : 0.63,
    length / 2 + 0.094,
    plate,
  );
  const batch = batchStaticModel(group),
    url = await exportModelUrl(batch);
  disposeThreeModel(group);
  disposeThreeModel(batch);
  return { kind, url, variant, length };
}

export async function createMovingAssets() {
  const assets: ActorAsset[] = [];
  try {
    for (let variant = 0; variant < 4; variant++)
      assets.push(await personModel(variant));
    for (let variant = 0; variant < 4; variant++)
      assets.push(await vehicleModel("car", variant));
    assets.push(await vehicleModel("bus", 0));
    return assets;
  } catch (error) {
    assets.forEach((asset) => URL.revokeObjectURL(asset.url));
    throw error;
  }
}
