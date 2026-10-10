import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import type { GeographicBuilding } from "./data/geographic-buildings";
import type { PhotoPatch } from "./data/photo-patches";
import { solvePhotoHomography } from "./photo-patch-model";

/** Source photo observation accepted after actual front/corner inspection. Timber materials remain separate. */
export const hakuPhotoPlaque = {
  buildingId: "hakuijeong",
  partId: "hakuijeong-pavilion",
  enabledByDefault: true,
  source: {
    url: "https://blogfiles.pstatic.net/MjAyNDA0MDdfMjA5/MDAxNzEyNDg2OTI4NTU5._h6u-FVIdN5RoK11Q09pcSdPAvnh9sIDUAwqZT8naK4g.G-FFeeK7QXVciCqWHHtVL6AI_sq4liSgp4PEBImDt7Ig.JPEG/20240407_134633.jpg",
    parentUrl: "https://blog.naver.com/aksblog/223408506698",
    originalFile: "references/research-20261010/next-reference-search/blog-223408506698-17.jpg",
    imageUrl: "/references/photo-surfaces/haku-plaque-2024-original.jpg",
    width: 4032,
    height: 3024,
    sha256: "d239231b7564de49b882d4d387ed79f46ba9061b86e0eac27a65daac3fed8f78",
    dateNote: "EXIF capture 2024-04-07 13:46:33; post published 2024-04-08; metadata not independently authenticated",
  },
  sourcePixels: [[1718, 1513], [1929, 1499], [1950, 1630], [1732, 1637]] as PhotoPatch["sourcePixels"],
  cornerUncertaintyPixels: 3,
  estimatedWidthMetres: 1.2,
  estimatedHeightMetres: 0.55,
  normalOffsetMetres: 0.14,
  estimatedCenterBelowEaveMetres: 0.54,
  backingDepthMetres: 0.025,
  status: "source-photo-observation-placement-and-size-estimated",
  limits: "Full photographed board and frame; roughly 212-218x125-133 source pixels. No transcription, sharpening or exact-dimensional fidelity claim. Original full photo is 6,471,405 bytes; texture payload increases.",
} as const;

/** CPU-only receiver geometry, useful for checking UV corners and outward winding. */
export function createHakuPhotoPlaqueGeometry(building: GeographicBuilding) {
  if (building.id !== hakuPhotoPlaque.buildingId) return undefined;
  const part = building.parts.find((part) => part.id === hakuPhotoPlaque.partId);
  const bridgeStart = building.site?.steppedApproach?.start ?? building.site?.bridge?.start;
  if (!part || !bridgeStart) return undefined;
  const points = part.footprint.map(([e, n]) => new Vector3(e, 0, -n));
  const footprintCenter = points.reduce((sum, point) => sum.add(point), new Vector3())
    .divideScalar(points.length);
  // Same nearest-edge projection and along-edge coordinate as addPavilionDetails.
  let accessEdge = -1, accessAlong = 0, distance = Infinity;
  const bridgePoint = new Vector3(bridgeStart[0], 0, -bridgeStart[1]);
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length], edge = b.clone().sub(a);
    const fraction = Math.max(0, Math.min(1, bridgePoint.clone().sub(a).dot(edge) / edge.lengthSq()));
    const candidate = a.clone().addScaledVector(edge, fraction).distanceTo(bridgePoint);
    if (candidate < distance) {
      distance = candidate;
      accessEdge = index;
      accessAlong = fraction * edge.length();
    }
  });
  if (accessEdge < 0) return undefined;
  const a = points[accessEdge], b = points[(accessEdge + 1) % points.length];
  const axis = b.clone().sub(a).normalize();
  const beamCenter = a.clone().addScaledVector(axis, accessAlong);
  // Derive a perpendicular outward normal from the footprint, without a cardinal label.
  const outward = new Vector3(-axis.z, 0, axis.x);
  if (outward.dot(beamCenter.clone().sub(footprintCenter)) < 0) outward.negate();
  const up = new Vector3(0, 1, 0), right = up.clone().cross(outward).normalize();
  const center = beamCenter.clone().setY(part.baseHeight + part.height - hakuPhotoPlaque.estimatedCenterBelowEaveMetres)
    .addScaledVector(outward, hakuPhotoPlaque.normalOffsetMetres);
  const h = solvePhotoHomography(hakuPhotoPlaque.sourcePixels);
  const positions: number[] = [], uv: number[] = [];
  const append = (u: number, v: number) => {
    positions.push(...center.clone()
      .addScaledVector(right, (u - 0.5) * hakuPhotoPlaque.estimatedWidthMetres)
      .addScaledVector(up, (0.5 - v) * hakuPhotoPlaque.estimatedHeightMetres).toArray());
    const denominator = h[6] * u + h[7] * v + 1;
    uv.push(
      (h[0] * u + h[1] * v + h[2]) / denominator / hakuPhotoPlaque.source.width,
      1 - (h[3] * u + h[4] * v + h[5]) / denominator / hakuPhotoPlaque.source.height,
    );
  };
  // Projective interior UV sampling; no cropped, synthesized, or retyped image.
  const columns = 32, rows = 16;
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = x / columns, b = y / rows, c = (x + 1) / columns, d = (y + 1) / rows;
    for (const [u, v] of [[a, b], [c, d], [c, b], [a, b], [a, d], [c, d]]) append(u, v);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return { geometry, center, outward, right, up, accessEdge, accessAlong };
}

/** Add the observed plaque while leaving the existing structural geometry and materials intact. */
export async function addHakuPhotoPlaque(group: Group, building: GeographicBuilding) {
  const receiver = createHakuPhotoPlaqueGeometry(building);
  if (!receiver) return;
  let map;
  try {
    map = await new TextureLoader().loadAsync(hakuPhotoPlaque.source.imageUrl);
  } catch (error) {
    receiver.geometry.dispose();
    throw error;
  }
  map.colorSpace = SRGBColorSpace;
  map.userData.mimeType = "image/jpeg";
  const material = new MeshStandardMaterial({
    color: "white", map, roughness: 0.9, metalness: 0,
    emissive: "black", transparent: false, opacity: 1,
  });
  material.name = "haku-original-photo-plaque-matte-opt-in";
  material.userData = { ...hakuPhotoPlaque, sourcePixelsUnmodified: true };
  const face = new Mesh(receiver.geometry, material);
  face.name = "haku-photo-plaque-face-opt-in";
  const backing = new Mesh(
    new BoxGeometry(hakuPhotoPlaque.estimatedWidthMetres, hakuPhotoPlaque.estimatedHeightMetres, hakuPhotoPlaque.backingDepthMetres),
    new MeshStandardMaterial({ color: "#332c20", roughness: 0.9, metalness: 0 }),
  );
  backing.name = "haku-photo-plaque-plain-backing-opt-in";
  backing.position.copy(receiver.center).addScaledVector(receiver.outward, -hakuPhotoPlaque.backingDepthMetres / 2 - 0.001);
  backing.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(receiver.right, receiver.up, receiver.outward));
  group.add(backing, face);
  group.userData.hakuPhotoPlaque = {
    ...hakuPhotoPlaque,
    accessEdge: receiver.accessEdge,
    accessAlongMetres: receiver.accessAlong,
    center: receiver.center.toArray(),
    outward: receiver.outward.toArray(),
    sourcePixelsUnmodified: true,
    uvConvention: "original top-origin homography converted to bottom-origin v=1-v",
  };
}
