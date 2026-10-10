/** Coordinates match the building renderer: +X east, +Y up, +Z south. */
export interface LandscapeInstance {
  id: string;
  translation: [number, number, number];
  scale: [number, number, number];
  /** Right-handed rotation about +Y, in degrees; not a compass bearing. */
  yawDegrees: number;
}

/** Measured from the unmodified 49,715-triangle Poly Haven Tree Small 02 LOD.
 * The helper preserves its origin. To place its lowest vertex on ground Y,
 * use translationY = groundY - minimumY * scaleY. No automatic recentering.
 */
export const TREE_SMALL_02_50K_DATUM = Object.freeze({
  minimumY: -0.024031998589634895,
  height: 4.545011403039098,
  // Bounding-box midpoint of trunk vertices within 0.06 m of its lowest point.
  approximateStemBaseX: 0.0029138997197151184,
  approximateStemBaseZ: 0.000015523284673690796,
  sourceTriangles: 49715,
});

type JsonObject = Record<string, unknown>;
interface GltfNode extends JsonObject {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  extensions?: JsonObject;
}
interface GltfDocument extends JsonObject {
  asset: { version: string };
  nodes: GltfNode[];
  scenes: { nodes?: number[] }[];
  buffers: { byteLength: number; uri?: string }[];
  bufferViews?: JsonObject[];
  accessors?: JsonObject[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}

const INSTANCING = 'EXT_mesh_gpu_instancing';
const align4 = (value: number) => Math.ceil(value / 4) * 4;
const identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function matches(value: number[] | undefined, identity: number[]): boolean {
  return value === undefined || (value.length === identity.length
    && value.every((component, index) => component === identity[index]));
}

function validateInstances(instances: readonly LandscapeInstance[]): void {
  const ids = new Set<string>();
  for (const instance of instances) {
    if (!instance.id || ids.has(instance.id)) throw new Error('Landscape instance IDs must be unique and nonempty.');
    ids.add(instance.id);
    for (const vector of [instance.translation, instance.scale]) {
      if (vector.length !== 3 || vector.some(value => !Number.isFinite(value) || !Number.isFinite(Math.fround(value)))) {
        throw new Error(`Invalid Float32 transform for landscape instance ${instance.id}.`);
      }
    }
    if (instance.scale.some(value => Math.fround(value) <= 0)) throw new Error('Landscape instance scales must be positive Float32 values.');
    if (!Number.isFinite(instance.yawDegrees)) throw new Error('Landscape yaw must be finite.');
  }
}

/** Pure binary helper, also used by offline QA. Existing BIN bytes are unchanged.
 * Supports a self-contained GLB 2.0 with exactly one identity root mesh node.
 * Rejects other hierarchies rather than silently composing incorrect transforms.
 */
export function createLandscapeInstancedGlbBytes(
  source: ArrayBuffer,
  instances: readonly LandscapeInstance[],
): ArrayBuffer | undefined {
  if (instances.length === 0) return undefined;
  validateInstances(instances);
  const view = new DataView(source);
  if (source.byteLength < 28 || view.getUint32(0, true) !== 0x46546c67
    || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== source.byteLength) {
    throw new Error('Expected a complete GLB 2.0 file.');
  }
  const chunks: { type: number; bytes: Uint8Array }[] = [];
  let offset = 12;
  while (offset < source.byteLength) {
    if (offset + 8 > source.byteLength) throw new Error('Truncated GLB chunk header.');
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (length % 4 !== 0 || offset + 8 + length > source.byteLength) throw new Error('Invalid GLB chunk length.');
    chunks.push({ type, bytes: new Uint8Array(source, offset + 8, length) });
    offset += 8 + length;
  }
  if (chunks.length !== 2 || chunks[0].type !== 0x4e4f534a || chunks[1].type !== 0x004e4942) {
    throw new Error('Expected exactly one JSON chunk followed by one BIN chunk.');
  }
  const gltf = JSON.parse(new TextDecoder().decode(chunks[0].bytes)) as GltfDocument;
  if (gltf.asset?.version !== '2.0' || gltf.buffers?.length !== 1 || gltf.buffers[0].uri !== undefined) {
    throw new Error('Landscape GLB must have one embedded buffer.');
  }
  const oldLength = gltf.buffers[0].byteLength;
  if (!Number.isSafeInteger(oldLength) || oldLength < 0 || oldLength > chunks[1].bytes.length
    || chunks[1].bytes.length - oldLength > 3) throw new Error('Invalid embedded buffer length.');
  const node = gltf.nodes?.[0];
  if (gltf.nodes?.length !== 1 || !node || !Number.isInteger(node.mesh)
    || node.children?.length || !gltf.scenes?.length
    || gltf.scenes.some(scene => scene.nodes?.length !== 1 || scene.nodes[0] !== 0)
    || !matches(node.matrix, identityMatrix) || !matches(node.translation, [0, 0, 0])
    || !matches(node.rotation, [0, 0, 0, 1]) || !matches(node.scale, [1, 1, 1])) {
    throw new Error('Landscape instancing requires one identity root mesh node.');
  }
  if (node.extensions?.[INSTANCING]) throw new Error('Source GLB is already instanced.');
  if (Array.isArray(gltf.animations) && gltf.animations.length) throw new Error('Animated landscape assets are unsupported.');
  if (node.skin !== undefined) throw new Error('Skinned landscape assets are unsupported.');

  // Preserve the complete original BIN, including its original padding.
  const appendStart = chunks[1].bytes.length;
  const binaryLength = appendStart + instances.length * 40;
  if (!Number.isSafeInteger(binaryLength) || binaryLength > 0xffffffff - 28) throw new Error('Instanced GLB exceeds format size limits.');
  const binary = new Uint8Array(binaryLength);
  binary.set(chunks[1].bytes);
  const binaryView = new DataView(binary.buffer);
  gltf.bufferViews ??= [];
  gltf.accessors ??= [];
  let cursor = appendStart;
  const attributes: Record<string, number> = {};
  for (const [semantic, components] of [['TRANSLATION', 3], ['ROTATION', 4], ['SCALE', 3]] as const) {
    const start = cursor;
    const min = new Array<number>(components).fill(Infinity);
    const max = new Array<number>(components).fill(-Infinity);
    for (const instance of instances) {
      const angle = (instance.yawDegrees % 360) * Math.PI / 360;
      const values = semantic === 'TRANSLATION' ? instance.translation : semantic === 'SCALE'
        ? instance.scale : [0, Math.sin(angle), 0, Math.cos(angle)];
      values.forEach((value, index) => {
        const f32 = Math.fround(value);
        binaryView.setFloat32(cursor, f32, true);
        cursor += 4;
        min[index] = Math.min(min[index], f32);
        max[index] = Math.max(max[index], f32);
      });
    }
    const bufferView = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: start, byteLength: cursor - start });
    attributes[semantic] = gltf.accessors.length;
    gltf.accessors.push({ bufferView, componentType: 5126, count: instances.length,
      type: components === 4 ? 'VEC4' : 'VEC3', min, max });
  }
  node.extensions = { ...node.extensions, [INSTANCING]: { attributes } };
  gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), INSTANCING])];
  gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []), INSTANCING])];
  gltf.buffers[0].byteLength = binaryLength;
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonLength = align4(json.length);
  const total = 12 + 8 + jsonLength + 8 + binaryLength;
  if (total > 0xffffffff) throw new Error('Instanced GLB exceeds format size limits.');
  const result = new ArrayBuffer(total);
  const resultView = new DataView(result);
  [0x46546c67, 2, total, jsonLength, 0x4e4f534a].forEach((value, index) => resultView.setUint32(index * 4, value, true));
  const resultBytes = new Uint8Array(result);
  resultBytes.fill(0x20, 20, 20 + jsonLength);
  resultBytes.set(json, 20);
  resultView.setUint32(20 + jsonLength, binaryLength, true);
  resultView.setUint32(24 + jsonLength, 0x004e4942, true);
  resultBytes.set(binary, 28 + jsonLength);
  return result;
}

/** Empty input returns undefined without fetching. Caller owns URL.revokeObjectURL. */
export async function createLandscapeInstancedGlb(
  assetUrl: string,
  instances: readonly LandscapeInstance[],
): Promise<string | undefined> {
  if (instances.length === 0) return undefined;
  validateInstances(instances);
  const response = await fetch(assetUrl);
  if (!response.ok) throw new Error(`Landscape asset request failed: HTTP ${response.status}.`);
  const binary = createLandscapeInstancedGlbBytes(await response.arrayBuffer(), instances);
  return binary ? URL.createObjectURL(new Blob([binary], { type: 'model/gltf-binary' })) : undefined;
}
