import { addPavilionDetails, applyHakuWoodTrial } from "./pavilion-model";
import { pavilionDetails } from "./data/pavilion-details";
import { addHakuCurvedRoof } from "./haku-roof-model";
import { addHakuPhotoPlaque } from "./haku-plaque";
import { addHakuSteppedApproach } from "./haku-access-model";
import { hakuRoofProfileTrial } from "./data/haku-roof-profile";
import { architecturalUv, createArchitecturalMaterial } from './architectural-detail';
import {
  BoxGeometry,
  CylinderGeometry,
  Vector3,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  BufferGeometry,
  BufferAttribute,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  TextureLoader,
  PlaneGeometry,
  Path,
  Shape,
  Vector2,
  Color,
  ExtrudeGeometry,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingGroundProfile } from "./building-ground-profile";
import { photoPatches } from "./data/photo-patches";
import { createPhotoPatchMesh, subtractPhotoRegion } from "./photo-patch-model";
import { createRoofFrames, roofMetricUv } from "./roof-uv";
import { mainGlazingSamples, mainGlazingSource } from "./data/main-glazing";
import { roofMaterialTrial } from "./data/roof-material";
import type {
  BuildingPart,
  GeographicBuilding,
} from "./data/geographic-buildings";

const materialCache = new Map<string, MeshStandardMaterial>();
let environmentGlassTrial = false;
let neutralRoofTrial: boolean | undefined;
let continuousRoofTrial = true;
let photoGlassTrial = false;
let softRoofPatternTrial = false;
let syntheticGlassPattern = false;
let translucentWaterTrial = false;
let hakuCurvedRoofTrial = false;
let architecturalDetail = true;
export type BuildModelOptions = {
  enablePhotoPatches?: boolean;
  enableMaterialTrial?: boolean;
  enableEnvironmentGlass?: boolean;
  neutralRoof?: boolean;
  continuousRoofUV?: boolean;
  photoGlazing?: boolean;
  softRoofPattern?: boolean;
  hakuWoodTrial?: boolean;
  hakuWoodNormalOnly?: boolean;
  hakuWoodTinted?: boolean;
  hakuCurvedRoof?: boolean;
  hakuGeometry?: "compact";
  hakuPlaque?: "photo";
  graduateEntry?: "open";
  syntheticGlassPattern?: boolean;
  translucentWater?: boolean;
  architecturalDetail?: boolean;
};
const material = (color: string, metalness = 0) => {
  const key = `${color}/${metalness}`;
  let result = materialCache.get(key);
  if (!result) {
    result = new MeshStandardMaterial({
      color,
      roughness: 0.78,
      metalness,
      side: DoubleSide,
    });
    if (
      (metalness >= 0.2 &&
        [
          "#3b5052",
          "#40595b",
          "#527175",
          "#466268",
          "#2d4246",
          "#819a94",
        ].includes(color)) ||
      (environmentGlassTrial && metalness >= 0.2 && color === "#35484b")
    ) {
      if (environmentGlassTrial) {
        result.color.set("#83968f");
        result.metalness = 0.8;
        result.roughness = 0.12;
      } else {
        if (syntheticGlassPattern) result.map = windowReflection();
        result.roughness = 0.22;
      }
    }
    materialCache.set(key, result);
  }
  return result;
};
function facadeMaterial(color:string,kind:'plaster'|'stone'='plaster') {
  const key=`architectural/${kind}/${color}`;
  let result=materialCache.get(key);
  if(!result){result=createArchitecturalMaterial(color,kind);materialCache.set(key,result);}
  return result;
}

// Photo-proportioned brick modules; not a scan or a measured masonry drawing.
function brickMaterial(color: string) {
  const key = `brick/${color}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#b8b2a5";
  c.fillRect(0, 0, 512, 256);
  const base = new Color(color);
  for (let row = 0; row < 8; row++)
    for (let column = -1; column < 9; column++) {
      const variation = 0.94 + ((row * 37 + (column + 1) * 17) % 13) / 100;
      c.fillStyle = `#${base.clone().multiplyScalar(variation).getHexString()}`;
      c.fillRect(
        column * 64 + (row % 2) * 32 + 0.8,
        row * 32 + 1.2,
        62.4,
        29.6,
      );
    }
  const map = new CanvasTexture(canvas);
  map.wrapS = map.wrapT = RepeatWrapping;
  map.colorSpace = SRGBColorSpace;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = 512;
  normalCanvas.height = 256;
  const nc = normalCanvas.getContext("2d")!,
    pixels = nc.createImageData(512, 256);
  const relief = (x: number, y: number) => {
    const px = (x + 512) % 512,
      py = (y + 256) % 256,
      row = Math.floor(py / 32);
    const across = (px - (row % 2) * 32 + 512) % 64,
      vertical = py % 32;
    return across < 0.8 || across > 63.2 || vertical < 1.2 || vertical > 30.8
      ? -0.0015
      : 0;
  };
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 512; x++) {
      const dx = (relief(x + 1, y) - relief(x - 1, y)) / ((2 * 1.968) / 512);
      const dy = (relief(x, y + 1) - relief(x, y - 1)) / ((2 * 0.648) / 256);
      const inverse = 1 / Math.hypot(dx, dy, 1),
        i = (y * 512 + x) * 4;
      pixels.data[i] = Math.round((-dx * inverse * 0.5 + 0.5) * 255);
      pixels.data[i + 1] = Math.round((-dy * inverse * 0.5 + 0.5) * 255);
      pixels.data[i + 2] = Math.round((inverse * 0.5 + 0.5) * 255);
      pixels.data[i + 3] = 255;
    }
  nc.putImageData(pixels, 0, 0);
  const normalMap = new CanvasTexture(normalCanvas);
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
  const result = new MeshStandardMaterial({
    color: "#ffffff",
    map,
    normalMap,
    roughness: 0.87,
    side: DoubleSide,
  });
  result.name = `brick-${color}`;
  materialCache.set(key, result);
  return result;
}

function metricBrickUv(geometry: BufferGeometry) {
  const positions = geometry.getAttribute("position"),
    normals = geometry.getAttribute("normal"),
    uv: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    if (Math.abs(normals.getY(i)) > 0.8) uv.push(x / 1.968, -z / 0.648);
    else
      uv.push(
        (Math.abs(normals.getX(i)) > Math.abs(normals.getZ(i)) ? -z : x) /
          1.968,
        y / 0.648,
      );
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}

function calmWaterMaterial(color: string) {
  const key = `water/${color}`,
    cached = materialCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = 128;
  normalCanvas.height = 128;
  const c = canvas.getContext("2d")!,
    nc = normalCanvas.getContext("2d")!;
  const diffuse = c.createImageData(128, 128),
    normal = nc.createImageData(128, 128);
  const base = new Color(color);
  base.convertLinearToSRGB();
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const e = (x / 128) * 4,
        n = (y / 128) * 4,
        i = (y * 128 + x) * 4;
      const variation =
        1 +
        0.045 * Math.sin((e * Math.PI) / 2) * Math.sin((n * Math.PI) / 2) +
        0.02 * Math.cos((e + n) * Math.PI);
      diffuse.data[i] = Math.round(base.r * 255 * variation);
      diffuse.data[i + 1] = Math.round(base.g * 255 * variation);
      diffuse.data[i + 2] = Math.round(base.b * 255 * variation);
      diffuse.data[i + 3] = 255;
      const dx =
        0.012 * Math.cos(e * Math.PI * 4) +
        0.006 * Math.cos((e + n) * Math.PI * 2);
      const dy =
        0.012 * Math.cos(n * Math.PI * 3) +
        0.006 * Math.cos((e + n) * Math.PI * 2);
      const inverse = 1 / Math.hypot(dx, dy, 1);
      normal.data[i] = Math.round((-0.5 * dx * inverse + 0.5) * 255);
      normal.data[i + 1] = Math.round((-0.5 * dy * inverse + 0.5) * 255);
      normal.data[i + 2] = Math.round((0.5 * inverse + 0.5) * 255);
      normal.data[i + 3] = 255;
    }
  c.putImageData(diffuse, 0, 0);
  nc.putImageData(normal, 0, 0);
  const map = new CanvasTexture(canvas),
    normalMap = new CanvasTexture(normalCanvas);
  map.wrapS = map.wrapT = normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
  map.colorSpace = SRGBColorSpace;
  const result = new MeshStandardMaterial({
    color: "#ffffff",
    map,
    normalMap,
    roughness: 0.22,
    metalness: 0.12,
    transparent: translucentWaterTrial,
    opacity: translucentWaterTrial ? 0.65 : 1,
    side: DoubleSide,
  });
  materialCache.set(key, result);
  return result;
}

function metricWaterUv(geometry: BufferGeometry) {
  const position = geometry.getAttribute("position"),
    uv: number[] = [];
  for (let i = 0; i < position.count; i++)
    uv.push(position.getX(i) / 4, -position.getZ(i) / 4);
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}

let reflectionTexture: CanvasTexture | undefined;
function windowReflection() {
  if (reflectionTexture) return reflectionTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const c = canvas.getContext("2d")!,
    gradient = c.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "#c3cbc7");
  gradient.addColorStop(0.47, "#8d9d9c");
  gradient.addColorStop(0.53, "#6e8075");
  gradient.addColorStop(1, "#425349");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 64, 128);
  c.fillStyle = "#52685c";
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(i * 8 - 5, 128);
    c.lineTo(i * 8 + 3, 55 + ((i * 17) % 23));
    c.lineTo(i * 8 + 16, 128);
    c.fill();
  }
  c.strokeStyle = "#cdd1cbb0";
  c.lineWidth = 1;
  for (let x = 3; x < 64; x += 16) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + 8, 128);
    c.stroke();
  }
  reflectionTexture = new CanvasTexture(canvas);
  reflectionTexture.colorSpace = SRGBColorSpace;
  return reflectionTexture;
}
function sideColumnWidth(part: BuildingPart) {
  return part.columnWidth ?? (part.columnSide === "east" ? 0.85 : 0.52);
}
function bodyFootprint(part: BuildingPart) {
  const depth =
      part.balconyStacks?.recessDepth ??
      part.veranda?.depth ??
      part.porchDepth ??
      0,
    side =
      part.balconyStacks?.side ??
      part.veranda?.side ??
      part.facadeSide ??
      part.columnSide ??
      "south";
  const minN = Math.min(...part.footprint.map((p) => p[1])),
    maxX = Math.max(...part.footprint.map((p) => p[0]));
  const maxN = Math.max(...part.footprint.map((p) => p[1]));
  const minX = Math.min(...part.footprint.map((p) => p[0]));
  if (part.colonnades?.length) {
    return part.footprint.map(
      ([e, n]) =>
        [
          e +
            (Math.abs(e - minX) < 0.01
              ? (part.colonnades?.find((face) => face.side === "west")?.depth ??
                0)
              : 0) -
            (Math.abs(e - maxX) < 0.01
              ? (part.colonnades?.find((face) => face.side === "east")?.depth ??
                0)
              : 0),
          n +
            (Math.abs(n - minN) < 0.01
              ? (part.colonnades?.find((face) => face.side === "south")
                  ?.depth ?? 0)
              : 0) -
            (Math.abs(n - maxN) < 0.01
              ? (part.colonnades?.find((face) => face.side === "north")
                  ?.depth ?? 0)
              : 0),
        ] as [number, number],
    );
  }
  return part.footprint.map(
    ([x, n]) =>
      [
        side === "east" && Math.abs(x - maxX) < 0.01
          ? x - depth
          : side === "west" && Math.abs(x - minX) < 0.01
            ? x + depth
            : x,
        side === "south" && Math.abs(n - minN) < 0.01
          ? n + depth
          : side === "north" && Math.abs(n - maxN) < 0.01
            ? n - depth
            : n,
      ] as [number, number],
  );
}
function roofLine(
  group: Group,
  a: number[],
  b: number[],
  color: string,
  radius = 0.17,
) {
  const from = new Vector3(...a),
    to = new Vector3(...b),
    direction = to.clone().sub(from);
  if (direction.lengthSq() < 1e-8) return;
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, direction.length(), 6),
    material(color),
  );
  mesh.position.copy(from.add(to).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  );
  group.add(mesh);
}
const roofTextures = new Map<boolean, CanvasTexture>();
function roofTexture(modern: boolean) {
  const neutral = neutralRoofTrial ?? !modern;
  const cached = roofTextures.get(modern);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  context.fillStyle = neutral ? "#f0f0f0" : modern ? "#c4c6c3" : "#9a9d98";
  context.fillRect(0, 0, 128, 64);
  context.strokeStyle = neutral ? "#b2b2b2" : modern ? "#858b87" : "#4b504c";
  context.lineWidth = modern ? 2 : 2.2;
  if (modern) {
    for (let x = 0; x <= 128; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 64);
      context.stroke();
    }
  } else {
    for (let x = 0; x < 128; x++) {
      const tone = Math.round(
        (neutral ? 240 : 130) +
          (neutral ? 12 : 30) * Math.cos((x / 128) * Math.PI * 2),
      );
      context.fillStyle = `rgb(${tone},${tone + (neutral ? 0 : 2)},${tone})`;
      context.fillRect(x, 0, 1, 64);
    }
    if (softRoofPatternTrial && neutral) {
      for (const { row, multiplier } of roofMaterialTrial.candidate
        .overlapRowMultipliers)
        for (let x = 0; x < 128; x++) {
          const tone = Math.round(
            (240 + 12 * Math.cos((x / 128) * Math.PI * 2)) * multiplier,
          );
          context.fillStyle = `rgb(${tone},${tone},${tone})`;
          context.fillRect(x, row, 1, 1);
        }
    } else {
      context.fillStyle = neutral ? "#b4b4b4" : "#646a66";
      context.fillRect(0, 61, 128, 3);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  roofTextures.set(modern, texture);
  return texture;
}

function addRoof(
  group: Group,
  part: BuildingPart,
  modern: boolean,
  suppressFascia = false,
) {
  const { footprint, roof } = part;
  const y = part.baseHeight + part.height;
  const cx = footprint.reduce((n, p) => n + p[0], 0) / footprint.length;
  const cn = footprint.reduce((n, p) => n + p[1], 0) / footprint.length;
  const eavePoints = footprint.map(([x, n]) => {
    const dx = x - cx,
      dn = n - cn,
      length = Math.hypot(dx, dn);
    return [x + (dx / length) * roof.eaves, n + (dn / length) * roof.eaves] as [
      number,
      number,
    ];
  });
  const points =
    roof.type === "flat" || roof.surface === "metal" ? eavePoints : footprint;
  const vertices: number[] = [];
  let rimGeometry: BufferGeometry | undefined;
  let rimSurface: MeshStandardMaterial | undefined;
  const rimFaceIndices: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) => {
    const ab = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ac = new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    if (ab.cross(ac).lengthSq() > 1e-12) vertices.push(...a, ...b, ...c);
  };
  if (roof.type === "flat") {
    const shape = new Shape(points.map(([x, n]) => new Vector2(x, n)));
    const geometry = new ExtrudeGeometry(shape, {
      depth: Math.max(0.05, roof.height),
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y, 0);
    group.add(new Mesh(geometry, material(roof.color)));
    return;
  }
  if (!suppressFascia) {
    const fasciaShape = new Shape(
      eavePoints.map(([x, n]) => new Vector2(x, n)),
    );
    const fasciaGeometry = new ExtrudeGeometry(fasciaShape, {
      depth: roof.fasciaDepth ?? 0.32,
      bevelEnabled: false,
    });
    fasciaGeometry.rotateX(-Math.PI / 2);
    // Keep the cap below the lowest point of the curved tile edge (y - 0.12).
    fasciaGeometry.translate(0, y - (roof.fasciaDepth ?? 0.32) - 0.18, 0);
    group.add(
      new Mesh(fasciaGeometry, material(roof.fasciaColor ?? roof.color)),
    );
  }
  if (roof.surface !== "metal" && !roof.courtyardEdge) {
    const stripVertices: number[] = [],
      stripUv: number[] = [];
    let edgeIndex = 0;
    const tri = (a: number[], b: number[], c: number[]) => {
      for (const p of [a, b, c]) {
        stripVertices.push(...p);
        stripUv.push(p[0] / 4, -p[2] / 2);
        rimFaceIndices.push(edgeIndex);
      }
    };
    for (let i = 0; i < points.length; i++) {
      edgeIndex = i;
      const a = points[i],
        b = points[(i + 1) % points.length],
        oa = eavePoints[i],
        ob = eavePoints[(i + 1) % points.length];
      const inside = [
        [a[0], y, -a[1]],
        [(a[0] + b[0]) / 2, y, -(a[1] + b[1]) / 2],
        [b[0], y, -b[1]],
      ];
      const outside = [
        [oa[0], y + 0.23, -oa[1]],
        [(oa[0] + ob[0]) / 2, y - 0.12, -(oa[1] + ob[1]) / 2],
        [ob[0], y + 0.23, -ob[1]],
      ];
      for (let j = 0; j < 2; j++) {
        tri(inside[j], outside[j], outside[j + 1]);
        tri(inside[j], outside[j + 1], inside[j + 1]);
      }
    }
    const rim = new BufferGeometry();
    rim.setAttribute("position", new Float32BufferAttribute(stripVertices, 3));
    rim.setAttribute("uv", new Float32BufferAttribute(stripUv, 2));
    rim.computeVertexNormals();
    const rimMaterial = continuousRoofTrial
      ? material(roof.color, 0.12).clone()
      : material(roof.color, 0.12);
    rimMaterial.map = roofTexture(false);
    const rimMesh = new Mesh(rim, rimMaterial);
    rimMesh.userData.pavilionRoofSurface = suppressFascia;
    group.add(rimMesh);
    rimGeometry = rim;
    rimSurface = rimMaterial;
  }
  if (points.length === 4 && roof.well) {
    const [minE, minN, maxE, maxN] = roof.well.bounds;
    const inner = [
      [minE, minN],
      [maxE, minN],
      [maxE, maxN],
      [minE, maxN],
    ];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const a = [points[i][0], y, -points[i][1]];
      const b = [points[j][0], y, -points[j][1]];
      const c = [inner[j][0], y + roof.height, -inner[j][1]];
      const d = [inner[i][0], y + roof.height, -inner[i][1]];
      triangle(a, b, c);
      triangle(a, c, d);
      roofLine(group, d, c, roof.color, 0.08);
      if (roof.well.innerParapetHeight) {
        const edgeLength = Math.hypot(c[0] - d[0], c[2] - d[2]);
        const parapet = new Mesh(
          new BoxGeometry(edgeLength, roof.well.innerParapetHeight, 0.22),
          material("#ece9de"),
        );
        parapet.position.set(
          (c[0] + d[0]) / 2,
          y + roof.height + roof.well.innerParapetHeight / 2,
          (c[2] + d[2]) / 2,
        );
        parapet.rotation.y = -Math.atan2(c[2] - d[2], c[0] - d[0]);
        group.add(parapet);
      }
    }
    const deckTop = y + roof.well.floorRise;
    const deck = new Mesh(
      new BoxGeometry(maxE - minE, 0.16, maxN - minN),
      material("#b8bcb3"),
    );
    deck.position.set((minE + maxE) / 2, deckTop - 0.08, -(minN + maxN) / 2);
    group.add(deck);
    const centreN = (minN + maxN) / 2;
    const halfWidth = roof.well.skylightWidth / 2;
    const halfLength = Math.min(
      (maxE - minE) / 2 - 1,
      (roof.well.skylightLength ?? maxE - minE - 2) / 2,
    );
    const centreE = (minE + maxE) / 2;
    const startE = centreE - halfLength,
      endE = centreE + halfLength;
    const glass = material("#40595b", 0.25);
    const skylightVertices: number[] = [];
    const corners = [
      [startE, deckTop + 0.3, -(centreN - halfWidth)],
      [endE, deckTop + 0.3, -(centreN - halfWidth)],
      [endE, deckTop + 1.15, -centreN],
      [startE, deckTop + 1.15, -centreN],
      [startE, deckTop + 0.3, -(centreN + halfWidth)],
      [endE, deckTop + 0.3, -(centreN + halfWidth)],
    ];
    for (const ids of [
      [0, 1, 2],
      [0, 2, 3],
      [4, 3, 2],
      [4, 2, 5],
    ])
      for (const index of ids) skylightVertices.push(...corners[index]);
    const glazing = new BufferGeometry();
    glazing.setAttribute(
      "position",
      new Float32BufferAttribute(skylightVertices, 3),
    );
    const skylightUv: number[] = [];
    for (let i = 0; i < skylightVertices.length; i += 3)
      skylightUv.push(
        (skylightVertices[i] - startE) / (endE - startE),
        (skylightVertices[i + 2] + centreN + halfWidth) / (2 * halfWidth),
      );
    glazing.setAttribute("uv", new Float32BufferAttribute(skylightUv, 2));
    glazing.computeVertexNormals();
    group.add(new Mesh(glazing, glass));
    for (let x = startE; x <= endE; x += 2.5) {
      roofLine(
        group,
        [x, deckTop + 0.3, -(centreN - halfWidth)],
        [x, deckTop + 1.15, -centreN],
        "#b8c1bc",
        0.04,
      );
      roofLine(
        group,
        [x, deckTop + 1.15, -centreN],
        [x, deckTop + 0.3, -(centreN + halfWidth)],
        "#b8c1bc",
        0.04,
      );
    }
  } else if (points.length === 4 && roof.courtyardEdge) {
    const minX = Math.min(...points.map((p) => p[0])),
      maxX = Math.max(...points.map((p) => p[0]));
    const minN = Math.min(...points.map((p) => p[1])),
      maxN = Math.max(...points.map((p) => p[1]));
    const edge = roof.courtyardEdge;
    const vertex = ([x, n]: [number, number]) => [
      x,
      y +
        roof.height *
          (edge === "north"
            ? (n - minN) / (maxN - minN)
            : edge === "south"
              ? (maxN - n) / (maxN - minN)
              : edge === "east"
                ? (x - minX) / (maxX - minX)
                : (maxX - x) / (maxX - minX)),
      -n,
    ];
    triangle(vertex(points[0]), vertex(points[1]), vertex(points[2]));
    triangle(vertex(points[0]), vertex(points[2]), vertex(points[3]));
  } else if (points.length === 4) {
    let longest = 0,
      edge = 0;
    for (let i = 0; i < 4; i++) {
      const p = points[i],
        q = points[(i + 1) % 4],
        length = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (length > longest) {
        longest = length;
        edge = i;
      }
    }
    const a = points[edge],
      b = points[(edge + 1) % 4],
      c = points[(edge + 2) % 4],
      d = points[(edge + 3) % 4];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const width = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const inset = roof.type === "hip" ? Math.min(0.5, width / (2 * length)) : 0;
    const left = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2],
      right = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
    const ridgeA = [
      left[0] + (right[0] - left[0]) * inset,
      y + roof.height,
      -(left[1] + (right[1] - left[1]) * inset),
    ];
    const ridgeB = [
      right[0] + (left[0] - right[0]) * inset,
      y + roof.height,
      -(right[1] + (left[1] - right[1]) * inset),
    ];
    const aa = [a[0], y, -a[1]],
      bb = [b[0], y, -b[1]],
      cc = [c[0], y, -c[1]],
      dd = [d[0], y, -d[1]];
    if (roof.type === "hip-gable") {
      const t = Math.min(0.22, width / (3 * length));
      const outer = [aa, bb, cc, dd];
      const perimeter = [a, b, c, d];
      const upper = perimeter.map((p, i) => {
        const along = perimeter[[1, 0, 3, 2][i]],
          across = perimeter[[3, 2, 1, 0][i]];
        return [
          p[0] + (along[0] - p[0]) * t + (across[0] - p[0]) * 0.22,
          y + roof.height * 0.55,
          -(p[1] + (along[1] - p[1]) * t + (across[1] - p[1]) * 0.22),
        ];
      });
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        triangle(outer[i], outer[j], upper[j]);
        triangle(outer[i], upper[j], upper[i]);
      }
      const peakA = [
        (upper[0][0] + upper[3][0]) / 2,
        y + roof.height,
        (upper[0][2] + upper[3][2]) / 2,
      ];
      const peakB = [
        (upper[1][0] + upper[2][0]) / 2,
        y + roof.height,
        (upper[1][2] + upper[2][2]) / 2,
      ];
      triangle(upper[0], upper[1], peakB);
      triangle(upper[0], peakB, peakA);
      triangle(upper[2], upper[3], peakA);
      triangle(upper[2], peakA, peakB);
      const ends = new BufferGeometry();
      ends.setAttribute(
        "position",
        new Float32BufferAttribute(
          [
            ...upper[3],
            ...upper[0],
            ...peakA,
            ...upper[1],
            ...upper[2],
            ...peakB,
          ],
          3,
        ),
      );
      ends.computeVertexNormals();
      group.add(new Mesh(ends, material("#b78b52")));
      roofLine(group, peakA, peakB, roof.color, 0.18);
    } else {
      triangle(aa, bb, ridgeB);
      triangle(aa, ridgeB, ridgeA);
      triangle(cc, dd, ridgeA);
      triangle(cc, ridgeA, ridgeB);
      triangle(dd, aa, ridgeA);
      triangle(bb, cc, ridgeB);
      roofLine(group, ridgeA, ridgeB, roof.color, 0.25);
      for (const [corner, ridge] of [
        [aa, ridgeA],
        [dd, ridgeA],
        [bb, ridgeB],
        [cc, ridgeB],
      ])
        roofLine(group, corner, ridge, roof.color, 0.13);
    }
  } else {
    // Multi-wing irregular footprints retain their traced perimeter and a pitched canopy.
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      triangle([a[0], y, -a[1]], [b[0], y, -b[1]], [cx, y + roof.height, -cn]);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  const uv: number[] = [];
  for (let i = 0; i < vertices.length; i += 9) {
    const a = new Vector3(
      ...(vertices.slice(i, i + 3) as [number, number, number]),
    );
    const b = new Vector3(
      ...(vertices.slice(i + 3, i + 6) as [number, number, number]),
    );
    const c = new Vector3(
      ...(vertices.slice(i + 6, i + 9) as [number, number, number]),
    );
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const down = new Vector3(0, -1, 0)
      .addScaledVector(normal, normal.y)
      .normalize();
    const cross = down.clone().cross(normal).normalize();
    for (const point of [a, b, c])
      uv.push(
        ...(modern
          ? [point.x / 4, -point.z / 2]
          : [point.dot(cross) / 0.33, point.dot(down) / 0.34]),
      );
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  if (continuousRoofTrial && !modern) {
    const { frames, faceIndices } = createRoofFrames(points, y, vertices);
    const setUv = (target: BufferGeometry, faces: number[]) => {
      const positions = target.getAttribute("position"),
        coordinates: number[] = [];
      for (let i = 0; i < positions.count; i++)
        coordinates.push(
          ...roofMetricUv(
            new Vector3().fromBufferAttribute(positions, i),
            frames[faces[i]],
          ),
        );
      target.setAttribute("uv", new Float32BufferAttribute(coordinates, 2));
    };
    setUv(geometry, faceIndices);
    if (rimGeometry) {
      setUv(rimGeometry, rimFaceIndices);
      const positions = rimGeometry.getAttribute("position"),
        normals = rimGeometry.getAttribute("normal"),
        sums = new Map<string, Vector3>();
      const key = (i: number) =>
        `${rimFaceIndices[i]}:${positions.getX(i).toFixed(6)}:${positions.getY(i).toFixed(6)}:${positions.getZ(i).toFixed(6)}`;
      for (let i = 0; i < positions.count; i++) {
        let sum = sums.get(key(i));
        if (!sum) {
          sum = new Vector3();
          sums.set(key(i), sum);
        }
        sum.add(new Vector3().fromBufferAttribute(normals, i));
      }
      for (let i = 0; i < positions.count; i++) {
        const normal = sums.get(key(i))!.clone().normalize();
        normals.setXYZ(i, normal.x, normal.y, normal.z);
      }
    }
  }
  const roofMaterial =
    continuousRoofTrial && !modern
      ? material(roof.color, 0.12).clone()
      : material(roof.color, 0.12);
  roofMaterial.map = roofTexture(modern);
  if (!modern) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(128, 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 128; x++) {
        const slope = 0.23 * Math.sin((x / 128) * Math.PI * 2);
        const index = (y * 128 + x) * 4;
        pixels.data[index] = 128 + slope * 127;
        pixels.data[index + 1] = 128;
        pixels.data[index + 2] = 128 + Math.sqrt(1 - slope * slope) * 127;
        pixels.data[index + 3] = 255;
      }
    context.putImageData(pixels, 0, 0);
    roofMaterial.normalMap = new CanvasTexture(canvas);
    roofMaterial.normalMap.wrapS = roofMaterial.normalMap.wrapT =
      RepeatWrapping;
    if (continuousRoofTrial && rimSurface)
      rimSurface.normalMap = roofMaterial.normalMap;
  }
  const roofMesh = new Mesh(geometry, roofMaterial);
  roofMesh.userData.pavilionRoofSurface = suppressFascia;
  group.add(roofMesh);
}

function addWindows(group: Group, part: BuildingPart) {
  if (
    !part.windowBand ||
    [
      "gate",
      "curtain-grid",
      "stone-grid",
      "balcony",
      "brick-grid",
      "bay-window",
      "timber",
    ].includes(part.facadeStyle ?? "")
  )
    return;
  const glazing = material("#3b5052", 0.25),
    frame = material("#9b9e91");
  const floors = part.windowRows ?? Math.max(1, Math.floor(part.height / 3.5));
  const footprint = bodyFootprint(part),
    side = part.facadeSide ?? part.columnSide ?? "south";
  const minN = Math.min(...footprint.map((p) => p[1])),
    maxX = Math.max(...footprint.map((p) => p[0]));
  const maxN = Math.max(...footprint.map((p) => p[1]));
  const minX = Math.min(...footprint.map((p) => p[0]));
  footprint.forEach((a, i) => {
    const b = footprint[(i + 1) % footprint.length],
      dx = b[0] - a[0],
      dn = b[1] - a[1],
      length = Math.hypot(dx, dn);
    const edgeSide =
      Math.abs(a[1] - b[1]) < 0.01
        ? Math.abs(a[1] - maxN) < 0.01
          ? "north"
          : "south"
        : Math.abs(a[0] - maxX) < 0.01
          ? "east"
          : "west";
    if (
      part.facades?.some((facade) => facade.side === edgeSide) ||
      part.glazedOpenings?.some((opening) => opening.side === edgeSide) ||
      part.photoBayWindows?.side === edgeSide ||
      part.windowLayouts?.some((layout) => layout.side === edgeSide)
    )
      return;
    const front =
      side === "south"
        ? Math.abs(a[1] - minN) < 0.01 && Math.abs(b[1] - minN) < 0.01
        : side === "north"
          ? Math.abs(a[1] - maxN) < 0.01 && Math.abs(b[1] - maxN) < 0.01
          : side === "west"
            ? Math.abs(a[0] - minX) < 0.01 && Math.abs(b[0] - minX) < 0.01
            : Math.abs(a[0] - maxX) < 0.01 && Math.abs(b[0] - maxX) < 0.01;
    const count =
      front && part.facadeBays
        ? part.facadeBays
        : part.facadeStyle === "ribbon"
          ? Math.max(1, Math.floor(length / 2))
          : Math.floor(length / 3.2);
    for (let floor = 0; floor < floors; floor++)
      for (let w = 0; w < count; w++) {
        const f =
          front && part.facadeBays ? (w + 0.5) / count : (w + 1) / (count + 1);
        if (
          front &&
          part.entrance &&
          part.facadeStyle === "colonnade" &&
          Math.abs((f - 0.5) * length) < part.entrance.width * 0.48
        )
          continue;
        const x = a[0] + dx * f,
          z = -(a[1] + dn * f);
        const y =
          part.baseHeight +
          (part.facadeStyle === "ribbon"
            ? floor === 0
              ? 2.7
              : part.height - 1.3
            : front && part.facadeStyle === "colonnade"
              ? side === "east"
                ? 3.2 + floor * 5.6
                : 3 + floor * 3.4
              : 1.8 + floor * 3.5);
        const height =
          part.facadeStyle === "ribbon"
            ? floor === 0
              ? 1.1
              : 0.75
            : front && part.facadeStyle === "colonnade" && side === "east"
              ? 3.2
              : 1.6;
        const width =
          part.facadeStyle === "ribbon"
            ? floor === 0
              ? 1.5
              : length / count - 0.25
            : front && part.facadeStyle === "colonnade"
              ? side === "east"
                ? 2.1
                : 2.8
              : part.facadeStyle === "research"
                ? 1.45
                : 1.8;
        const backing = new Mesh(new BoxGeometry(width, height, 0.16), frame);
        backing.position.set(x, y, z);
        backing.rotation.y = Math.atan2(dn, dx);
        group.add(backing);
        const pane = new Mesh(
          new BoxGeometry(width - 0.16, height - 0.16, 0.19),
          glazing,
        );
        pane.position.copy(backing.position);
        pane.userData.photoPartId = part.id;
        pane.userData.photoSurface = "glass";
        pane.rotation.copy(backing.rotation);
        group.add(pane);
        if (front)
          for (const horizontal of [false, true]) {
            const bar = new Mesh(
              new BoxGeometry(
                horizontal ? width : 0.065,
                horizontal ? 0.065 : height,
                0.22,
              ),
              material("#616b64"),
            );
            bar.position.copy(backing.position);
            bar.rotation.copy(backing.rotation);
            group.add(bar);
          }
      }
  });
}

function addFacade(
  group: Group,
  part: BuildingPart,
  entryGroundHeight?: number,
) {
  const minX = Math.min(...part.footprint.map((p) => p[0])),
    maxX = Math.max(...part.footprint.map((p) => p[0]));
  const minN = Math.min(...part.footprint.map((p) => p[1])),
    maxN = Math.max(...part.footprint.map((p) => p[1]));
  const side = part.facadeSide ?? part.columnSide ?? "south";
  const recess = part.porchDepth ?? 0;
  const faceMesh = (
    mesh: Mesh,
    along: number,
    height: number,
    outward = 0.2,
  ) => {
    if (part.veranda?.side === side) outward -= part.veranda.depth;
    const angle =
      side === "east"
        ? Math.PI / 2
        : side === "west"
          ? -Math.PI / 2
          : side === "north"
            ? Math.PI
            : 0;
    const tangentX = Math.cos(angle),
      tangentZ = -Math.sin(angle);
    const normalX = Math.sin(angle),
      normalZ = Math.cos(angle);
    mesh.position.set(
      (side === "east" ? maxX : side === "west" ? minX : (minX + maxX) / 2) +
        tangentX * along +
        normalX * outward,
      part.baseHeight + height,
      -(side === "north" ? maxN : side === "south" ? minN : (minN + maxN) / 2) +
        tangentZ * along +
        normalZ * outward,
    );
    mesh.rotation.y = angle;
    group.add(mesh);
    return mesh;
  };
  if (part.facadeStyle === "archive-fins") {
    const width =
      side === "east" || side === "west" ? maxN - minN : maxX - minX;
    for (let row = 1; row <= 3; row++)
      faceMesh(
        new Mesh(new BoxGeometry(width, 0.14, 0.16), material("#4b5352")),
        0,
        (part.height * row) / 4,
        0.13,
      );
    const count = part.facadeBays ?? 9;
    for (let i = 0; i < count; i++)
      faceMesh(
        new Mesh(
          new BoxGeometry(0.42, part.height * 0.58, 0.5),
          material(part.wallColor),
        ),
        width * ((i + 0.5) / count - 0.5),
        part.height * 0.5,
        0.27,
      );
  }
  if (part.entrance) {
    const { width, depth, steps, rise, landing } = part.entrance;
    for (let i = 0; i < steps; i++) {
      const ground = (entryGroundHeight ?? part.baseHeight) - part.baseHeight;
      const stepDepth = (depth - (landing?.depth ?? 0)) / steps;
      const distance = (i + 0.5) * stepDepth;
      const upper = landing && distance >= landing.start;
      const outward = distance + (upper ? landing.depth : 0);
      const top = landing
        ? upper
          ? landing.rise +
            ((ground - landing.rise) * (distance - landing.start)) /
              Math.max(0.1, depth - landing.depth - landing.start)
          : rise + ((landing.rise - rise) * distance) / landing.start
        : rise + ((ground - rise) * i) / steps;
      const h = Math.max(0.02, top - ground);
      faceMesh(
        new Mesh(new BoxGeometry(width, h, stepDepth), material("#c5c1b5")),
        0,
        ground + h / 2,
        1 + outward,
      );
    }
    if (landing) {
      const ground = (entryGroundHeight ?? part.baseHeight) - part.baseHeight;
      const h = Math.max(0.04, landing.rise - ground);
      faceMesh(
        new Mesh(new BoxGeometry(width, h, landing.depth), material("#c5c1b5")),
        0,
        ground + h / 2,
        1 + landing.start + landing.depth / 2,
      );
    }
    if (architecturalDetail && part.entrance.sideCurbs) {
      const curb=part.entrance.sideCurbs;
      const ground=(entryGroundHeight??part.baseHeight)-part.baseHeight;
      const profile=landing
        ? [[1,rise],[1+landing.start,landing.rise],[1+landing.start+landing.depth,landing.rise],[1+depth,ground]]
        : [[1,rise],[1+depth,ground]];
      for(const sideSign of [-1,1])for(let segment=0;segment<profile.length-1;segment++){
        const [z0,y0]=profile[segment],[z1,y1]=profile[segment+1];
        const x0=sideSign*width/2+(sideSign<0?-curb.width:0),x1=x0+curb.width;
        const vertices=[
          [x0,ground,z0],[x1,ground,z0],[x1,y0+curb.height,z0],[x0,y0+curb.height,z0],
          [x0,ground,z1],[x1,ground,z1],[x1,y1+curb.height,z1],[x0,y1+curb.height,z1],
        ];
        const faces=[0,2,1,0,3,2,4,6,7,4,5,6,0,5,4,0,1,5,3,6,2,3,7,6,0,7,3,0,4,7,1,6,5,1,2,6];
        const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(faces.flatMap(index=>vertices[index]),3));geometry.computeVertexNormals();architecturalUv(geometry);
        faceMesh(new Mesh(geometry,facadeMaterial('#d3d0c7','stone')),0,0,0);
      }
    }
    if (!part.glazedOpenings?.some((opening) => opening.side === side)) {
      const doorwayWidth =
        part.entrance.doorwayWidth ?? Math.min(width * 0.65, 6);
      const doorHeight = part.entrance.doorwayHeight ?? 3.2;
      faceMesh(
        new Mesh(
          new BoxGeometry(doorwayWidth, doorHeight, 0.25),
          material("#2d4246", 0.2),
        ),
        0,
        rise + doorHeight / 2,
        0.18 - recess,
      );
      for (const along of [-doorwayWidth / 2, 0, doorwayWidth / 2])
        faceMesh(
          new Mesh(
            new BoxGeometry(0.15, doorHeight + 0.2, 0.3),
            material("#c7c4b9"),
          ),
          along,
          rise + doorHeight / 2,
          0.35 - recess,
        );
      faceMesh(
        new Mesh(
          new BoxGeometry(doorwayWidth + 0.4, 0.22, 0.35),
          material("#bcb7a8"),
        ),
        0,
        rise + doorHeight + 0.15,
        0.3 - recess,
      );
    }
  }
  if (recess > 0) {
    const width = side === "east" ? maxN - minN : maxX - minX,
      floor = part.entrance?.rise ?? 0.8;
    faceMesh(
      new Mesh(new BoxGeometry(width, 0.35, recess + 1), material("#b3b1a5")),
      0,
      floor - 0.17,
      -recess / 2 + 0.4,
    );
    faceMesh(
      new Mesh(new BoxGeometry(width, 0.32, recess + 0.7), material("#bcbcaf")),
      0,
      part.height - 0.16,
      -recess / 2 + 0.3,
    );
    const beamY =
      part.facadeStyle === "colonnade" && side === "south" ? 5.25 : floor + 0.2;
    faceMesh(
      new Mesh(new BoxGeometry(width, 0.24, recess + 0.8), material("#b5b7a9")),
      0,
      beamY,
      -recess / 2 + 0.3,
    );
    for (let along = -width / 2 + 2; along < width / 2; along += 4.5)
      faceMesh(
        new Mesh(new BoxGeometry(0.04, part.height, 0.07), material("#bcbdb0")),
        along,
        part.height / 2,
        0.19 - recess,
      );
    if (
      part.facadeStyle === "colonnade" &&
      side === "south" &&
      part.entrance &&
      !part.colonnadeTreatment?.suppressCentralBalcony
    ) {
      const width = part.balconyWidth ?? part.entrance.width + 2;
      faceMesh(
        new Mesh(
          new BoxGeometry(width, 0.22, recess + 1.1),
          material("#c8c8b9"),
        ),
        0,
        5.35,
        0.25 - recess / 2,
      );
      faceMesh(
        new Mesh(new BoxGeometry(width, 1.05, 0.14), material("#819a94", 0.35)),
        0,
        5.97,
        0.48,
      );
      for (let i = 0; i <= 6; i++)
        faceMesh(
          new Mesh(new BoxGeometry(0.09, 1.13, 0.2), material("#d4d5ca")),
          width * (i / 6 - 0.5),
          5.97,
          0.54,
        );
      faceMesh(
        new Mesh(new BoxGeometry(width, 0.1, 0.22), material("#d1d2c6")),
        0,
        6.53,
        0.55,
      );
      if (!part.colonnadeTreatment?.suppressCentralGlazing)
        faceMesh(
          new Mesh(
            new BoxGeometry(width - 1, 2.3, 0.14),
            material("#40595b", 0.25),
          ),
          0,
          6.3,
          0.2 - recess,
        );
    }
  }
  if (part.facadeStyle === "stone-grid") {
    const width =
        (side === "east" || side === "west" ? maxN - minN : maxX - minX) - 1,
      height = part.height - 1.2,
      bays = part.facadeBays ?? 8,
      rows = part.windowRows ?? 3;
    for (let row = 0; row < rows; row++)
      for (let bay = 0; bay < bays; bay++) {
        if (part.windowLayouts?.some((layout) => layout.side === side))
          continue;
        const w = width / bays - 0.8,
          h = height / rows - 0.8,
          along = width * ((bay + 0.5) / bays - 0.5),
          y = 0.6 + (height * (row + 0.5)) / rows;
        faceMesh(
          new Mesh(
            new BoxGeometry(w + 0.25, h + 0.25, 0.18),
            material("#929d99"),
          ),
          along,
          y,
          0.14,
        );
        faceMesh(
          new Mesh(new BoxGeometry(w, h, 0.19), material("#466268", 0.4)),
          along,
          y,
          0.15,
        );
        faceMesh(
          new Mesh(new BoxGeometry(0.075, h, 0.28), material("#ccd0c6")),
          along,
          y,
          0.25,
        );
      }
    for (let row = 0; row <= rows; row++)
      faceMesh(
        new Mesh(new BoxGeometry(width, 0.4, 0.35), material(part.wallColor)),
        0,
        0.6 + (height * row) / rows,
        0.36,
      );
    for (let bay = 0; bay <= bays; bay++)
      faceMesh(
        new Mesh(new BoxGeometry(0.6, height, 0.35), material(part.wallColor)),
        width * (bay / bays - 0.5),
        height / 2 + 0.6,
        0.36,
      );
  }
  if (part.facadeStyle === "curtain-grid") {
    const width =
      (side === "east" || side === "west" ? maxN - minN : maxX - minX) - 1.2;
    const height = part.height - 1.4;
    faceMesh(
      new Mesh(new BoxGeometry(width, height, 0.23), material("#527175", 0.6)),
      0,
      height / 2 + 0.5,
      0.22,
    );
    const bays = part.facadeBays ?? 8;
    for (let i = 0; i <= bays; i++)
      faceMesh(
        new Mesh(new BoxGeometry(0.2, height, 0.32), material("#d4d3c9")),
        width * (i / bays - 0.5),
        height / 2 + 0.5,
        0.36,
      );
    for (let i = 1; i <= (part.windowRows ?? 3); i++)
      faceMesh(
        new Mesh(new BoxGeometry(width, 0.16, 0.32), material("#d4d3c9")),
        0,
        0.5 + (height * i) / (part.windowRows ?? 3),
        0.36,
      );
  }
  if (
    !part.balconyStacks &&
    part.photoBayWindows?.side !== side &&
    ["balcony", "brick-grid", "bay-window", "timber"].includes(
      part.facadeStyle ?? "",
    )
  ) {
    const style = part.facadeStyle as string,
      width = side === "east" || side === "west" ? maxN - minN : maxX - minX,
      rows = style === "timber" ? 1 : (part.windowRows ?? 3),
      bays = part.facadeBays ?? Math.max(3, Math.round(width / 5));
    for (let row = 0; row < rows; row++) {
      const y =
        style === "timber"
          ? (part.veranda?.floorHeight ?? 0.5) + 1.3
          : 1.8 + row * 3.3;
      if (style === "balcony") {
        faceMesh(
          new Mesh(new BoxGeometry(width, 0.28, 2.4), material("#c9c4b4")),
          0,
          y - 1,
          0.8,
        );
        faceMesh(
          new Mesh(new BoxGeometry(width, 0.15, 0.15), material("#c4c6bc")),
          0,
          y,
          1.9,
        );
        const bars = Math.round(width / 0.7);
        for (let j = 0; j <= bars; j++)
          faceMesh(
            new Mesh(new BoxGeometry(0.045, 1, 0.06), material("#9a9e92")),
            width * (j / bars - 0.5),
            y - 0.5,
            1.9,
          );
      }
      for (let bay = 0; bay < bays; bay++) {
        const along = width * ((bay + 0.5) / bays - 0.5),
          paneWidth =
            style === "timber"
              ? width / bays - 0.35
              : Math.min(3, width / bays - 1),
          paneHeight = style === "timber" ? 2.6 : 1.9;
        if (part.windowLayouts?.some((layout) => layout.side === side))
          continue;
        const projected =
          style === "bay-window" &&
          (!part.bayWindowRows || part.bayWindowRows.includes(row));
        if (projected)
          faceMesh(
            new Mesh(
              new BoxGeometry(paneWidth + 0.5, paneHeight + 0.5, 1.1),
              material("#e5e2d4"),
            ),
            along,
            y,
            0.6,
          );
        faceMesh(
          new Mesh(
            new BoxGeometry(paneWidth + 0.2, paneHeight + 0.2, 0.22),
            material(style === "timber" ? "#66513a" : "#a9aa9e"),
          ),
          along,
          y,
          projected ? 1.2 : 0.18,
        );
        faceMesh(
          new Mesh(
            new BoxGeometry(paneWidth, paneHeight, 0.25),
            material(
              style === "timber" ? "#bcbfb1" : "#3b5052",
              style === "timber" ? 0 : 0.25,
            ),
          ),
          along,
          y,
          projected ? 1.22 : 0.21,
        );
        for (const horizontal of [false, true])
          faceMesh(
            new Mesh(
              new BoxGeometry(
                horizontal ? paneWidth : 0.07,
                horizontal ? 0.07 : paneHeight,
                0.29,
              ),
              material(style === "timber" ? "#57412b" : "#b8b9ad"),
            ),
            along,
            y,
            projected ? 1.26 : 0.24,
          );
      }
    }
  }
  if (part.roof.courtyardEdge) {
    const edge = part.roof.courtyardEdge;
    const horizontal = edge === "north" || edge === "south";
    const mesh = new Mesh(
      new BoxGeometry(
        horizontal ? maxX - minX : 0.28,
        0.85,
        horizontal ? 0.28 : maxN - minN,
      ),
      material("#ece9de"),
    );
    mesh.position.set(
      horizontal ? (minX + maxX) / 2 : edge === "east" ? maxX : minX,
      part.baseHeight + part.height + part.roof.height + 0.42,
      horizontal ? -(edge === "north" ? maxN : minN) : -(minN + maxN) / 2,
    );
    group.add(mesh);
  }
  if (part.facadeStyle === "gate" && !part.pillarProfile) {
    for (let y = 0.65; y < part.height; y += 0.6) {
      const geometry = new BoxGeometry(
        maxX - minX + 0.015,
        0.035,
        maxN - minN + 0.015,
      );
      geometry.translate(
        (minX + maxX) / 2,
        part.baseHeight + y,
        -(minN + maxN) / 2,
      );
      group.add(new Mesh(geometry, material("#bcbfb7")));
    }
  }
  if (part.plaque) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 192;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#d8d4c7";
    context.fillRect(0, 0, 1024, 192);
    context.fillStyle = "#314a3e";
    context.font = '600 65px "Noto Sans KR", sans-serif';
    context.textAlign = "center";
    context.fillText(part.plaque, 512, 91);
    context.font = "20px sans-serif";
    context.fillText("THE ACADEMY OF KOREAN STUDIES", 512, 142);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const mat = material("#ffffff");
    mat.map = texture;
    const width = Math.min(
      12,
      (side === "east" ? maxN - minN : maxX - minX) - 0.4,
    );
    faceMesh(
      new Mesh(new PlaneGeometry(width, (width * 192) / 1024), mat),
      0,
      part.facadeStyle === "gate" ? part.height / 2 : part.height - 2,
      0.32,
    );
  }
}

function addFeaturePart(
  group: Group,
  building: GeographicBuilding,
  part: BuildingPart,
  hakuGeometry?: "compact",
) {
  const kind = building.kind;
  if (kind === "pavilion") {
    const detailed =
      building.id === pavilionDetails.buildingId &&
      pavilionDetails.enabledByDefault;
    const shape = new Shape(part.footprint.map(([x, n]) => new Vector2(x, n))),
      geometry = new ExtrudeGeometry(shape, {
        depth: 0.35,
        bevelEnabled: false,
      });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, part.baseHeight, 0);
    group.add(
      new Mesh(
        geometry,
        detailed
          ? new MeshStandardMaterial({
              color: pavilionDetails.wood.deck,
              roughness: 0.88,
              metalness: 0,
            })
          : material("#b0a58b"),
      ),
    );
    if (detailed)
      (
        (group.children[group.children.length - 1] as Mesh)
          .material as MeshStandardMaterial
      ).name = "haku-exposed-wood";
    for (const [x, n] of part.footprint) {
      const column = new Mesh(
        new CylinderGeometry(0.16, 0.2, part.height, 8),
        material("#9a703b"),
      );
      if (detailed) {
        column.material = new MeshStandardMaterial({
          color: pavilionDetails.wood.mid,
          roughness: 0.88,
          metalness: 0,
        });
        column.material.name = "haku-exposed-wood";
      }
      column.position.set(x, part.baseHeight + part.height / 2, -n);
      group.add(column);
    }
    for (const [x, n] of part.footprint) {
      const bottom = building.site?.water
        ? building.site.water.elevation - 0.5
        : 0;
      const stilt = new Mesh(
        new BoxGeometry(0.32, Math.max(0.5, part.baseHeight - bottom), 0.32),
        material("#d8d6c8"),
      );
      stilt.position.set(x, (part.baseHeight + bottom) / 2, -n);
      group.add(stilt);
    }
    if (!detailed)
      part.footprint.forEach((a, i) => {
        const b = part.footprint[(i + 1) % part.footprint.length];
        const balusters = Math.floor(
          Math.hypot(a[0] - b[0], a[1] - b[1]) / 0.28,
        );
        for (let j = 1; j < balusters; j++) {
          const t = j / balusters;
          const stick = new Mesh(
            new BoxGeometry(0.04, 0.6, 0.04),
            material("#a87b41"),
          );
          stick.position.set(
            a[0] + (b[0] - a[0]) * t,
            part.baseHeight + 0.9,
            -(a[1] + (b[1] - a[1]) * t),
          );
          group.add(stick);
        }
        for (const y of [0.6, 1.2])
          roofLine(
            group,
            [a[0], part.baseHeight + y, -a[1]],
            [b[0], part.baseHeight + y, -b[1]],
            "#9b763e",
            0.055,
          );
      });
    if (hakuCurvedRoofTrial && detailed && part.id === hakuRoofProfileTrial.partId) {
      const roofSurface = material(part.roof.color, 0.12).clone();
      roofSurface.name = "haku-curved-textured-roof";
      roofSurface.map = roofTexture(false);
      addHakuCurvedRoof(group, part, roofSurface);
    } else addRoof(group, part, false, detailed);
    if (detailed) addPavilionDetails(group, building, part, hakuGeometry);
    const cx =
      part.footprint.reduce((sum, p) => sum + p[0], 0) / part.footprint.length;
    const cn =
      part.footprint.reduce((sum, p) => sum + p[1], 0) / part.footprint.length;
    const peak = part.baseHeight + part.height + part.roof.height;
    const ornament = new Mesh(
      new CylinderGeometry(0.035, 0.085, 0.8, 8),
      material("#596568"),
    );
    ornament.position.set(cx, peak + 0.4, -cn);
    group.add(ornament);
    for (let i = 0; i < 4; i++) {
      const ring = new Mesh(
        new CylinderGeometry(0.13 - i * 0.02, 0.14 - i * 0.02, 0.07, 8),
        material("#7f8b89"),
      );
      ring.position.set(cx, peak + 0.13 + i * 0.16, -cn);
      group.add(ring);
    }
    return true;
  }
  if (kind === "pond") {
    const shape = new Shape(part.footprint.map(([x, n]) => new Vector2(x, n))),
      geometry = new ExtrudeGeometry(shape, {
        depth: 0.03,
        bevelEnabled: false,
      });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, part.baseHeight + 0.12, 0);
    const water = calmWaterMaterial(part.wallColor);
    metricWaterUv(geometry);
    group.add(new Mesh(geometry, water));
    const bridgeShape = new Shape([
      new Vector2(-14, 0),
      new Vector2(14, 0),
      new Vector2(14, 3.65),
      new Vector2(-14, 3.65),
    ]);
    for (let arch = 0; arch < 3; arch++) {
      const centre = (arch - 1) * 8.8,
        hole = new Path();
      hole.moveTo(centre - 3.5, 0.06);
      hole.lineTo(centre + 3.5, 0.06);
      hole.lineTo(centre + 3.5, 1.2);
      hole.quadraticCurveTo(centre + 3.5, 3.0, centre, 3.0);
      hole.quadraticCurveTo(centre - 3.5, 3.0, centre - 3.5, 1.2);
      hole.closePath();
      bridgeShape.holes.push(hole);
    }
    const bridgeGeometry = new ExtrudeGeometry(bridgeShape, {
      depth: 0.55,
      bevelEnabled: false,
      curveSegments: 10,
    });
    bridgeGeometry.translate(0, part.baseHeight + 0.05, -7);
    group.add(new Mesh(bridgeGeometry, material("#c9cec5")));
    for (const side of [-7, -5.2]) {
      const upper = new Mesh(
        new BoxGeometry(28, 0.18, 0.22),
        material("#e4e6db"),
      );
      upper.position.set(0, part.baseHeight + 4.45, side);
      group.add(upper);
      for (let x = -13.5; x <= 13.5; x += 1.5) {
        const baluster = new Mesh(
          new BoxGeometry(0.18, 0.7, 0.18),
          material("#d8ddd2"),
        );
        baluster.position.set(x, part.baseHeight + 4.0, side);
        group.add(baluster);
      }
    }
    const deck = new Mesh(new BoxGeometry(28, 0.28, 2.3), material("#c9cec5"));
    deck.position.set(0, part.baseHeight + 3.55, -6.2);
    group.add(deck);
    return true;
  }
  if (kind === "underground-parking") {
    if (part.retainingEntrance) {
      const entrance = part.retainingEntrance,
        side = entrance.side;
      const horizontal = side === "north" || side === "south",
        sign = side === "north" || side === "west" ? -1 : 1;
      const front = new Group();
      const minE = Math.min(...part.footprint.map((p) => p[0])),
        maxE = Math.max(...part.footprint.map((p) => p[0]));
      const minN = Math.min(...part.footprint.map((p) => p[1])),
        maxN = Math.max(...part.footprint.map((p) => p[1]));
      front.position.set(
        horizontal ? 0 : side === "east" ? maxE : minE,
        part.baseHeight,
        horizontal ? -(side === "north" ? maxN : minN) : 0,
      );
      front.rotation.y =
        side === "east"
          ? Math.PI / 2
          : side === "west"
            ? -Math.PI / 2
            : side === "north"
              ? Math.PI
              : 0;
      const block = (
        start: number,
        end: number,
        bottom: number,
        top: number,
      ) => {
        if (end <= start || top <= bottom) return;
        const mesh = new Mesh(
          new BoxGeometry(end - start, top - bottom, entrance.wallDepth),
          material(part.wallColor),
        );
        mesh.position.set(
          (sign * (start + end)) / 2,
          (bottom + top) / 2,
          -entrance.wallDepth / 2,
        );
        front.add(mesh);
      };
      let cursor = entrance.wallSpan[0];
      for (const opening of [...entrance.openings].sort(
        (a, b) => a.center - b.center,
      )) {
        const start = opening.center - opening.width / 2,
          end = opening.center + opening.width / 2;
        block(cursor, start, 0, entrance.wallHeight);
        block(start, end, opening.height, entrance.wallHeight);
        const dark = new Mesh(
          new PlaneGeometry(opening.width, opening.height),
          material("#17231f"),
        );
        dark.position.set(
          sign * opening.center,
          opening.height / 2,
          -entrance.wallDepth + 0.02,
        );
        front.add(dark);
        cursor = end;
      }
      block(cursor, entrance.wallSpan[1], 0, entrance.wallHeight);
      const signCanvas = document.createElement("canvas");
      signCanvas.width = 512;
      signCanvas.height = 64;
      const signContext = signCanvas.getContext("2d")!;
      signContext.fillStyle = part.wallColor;
      signContext.fillRect(0, 0, 512, 64);
      signContext.fillStyle = "#334a3d";
      signContext.font = "600 40px sans-serif";
      signContext.textAlign = "center";
      signContext.fillText(part.plaque ?? "PARKING", 256, 46);
      const signTexture = new CanvasTexture(signCanvas);
      signTexture.colorSpace = SRGBColorSpace;
      const signMaterial = new MeshStandardMaterial({
        map: signTexture,
        roughness: 0.85,
        side: DoubleSide,
      });
      const labelPlane = new Mesh(new PlaneGeometry(6.5, 0.7), signMaterial);
      const portalCentre =
        entrance.openings.reduce((sum, o) => sum + o.center, 0) /
        entrance.openings.length;
      labelPlane.position.set(
        sign * portalCentre,
        entrance.wallHeight - 0.7,
        0.035,
      );
      front.add(labelPlane);
      const span = entrance.wallSpan[1] - entrance.wallSpan[0],
        centre = (entrance.wallSpan[0] + entrance.wallSpan[1]) / 2;
      const approach = new Mesh(
        new BoxGeometry(span, 0.035, entrance.approachDepth),
        material("#777970"),
      );
      approach.position.set(sign * centre, 0.015, entrance.approachDepth / 2);
      front.add(approach);
      for (const h of [0.2, 0.95]) {
        const rail = new Mesh(
          new BoxGeometry(span, 0.045, 0.045),
          material("#858e83"),
        );
        rail.position.set(
          sign * centre,
          entrance.wallHeight + h,
          -entrance.wallDepth / 2,
        );
        front.add(rail);
      }
      const count = Math.ceil(span / 1.4);
      for (let i = 0; i <= count; i++) {
        const post = new Mesh(
          new BoxGeometry(0.045, 0.95, 0.045),
          material("#858e83"),
        );
        post.position.set(
          sign * (entrance.wallSpan[0] + (span * i) / count),
          entrance.wallHeight + 0.475,
          -entrance.wallDepth / 2,
        );
        front.add(post);
      }
      group.add(front);
      return true;
    }
    const minX = Math.min(...part.footprint.map((p) => p[0])),
      maxX = Math.max(...part.footprint.map((p) => p[0])),
      minN = Math.min(...part.footprint.map((p) => p[1])),
      maxN = Math.max(...part.footprint.map((p) => p[1]));
    const portalHeight = Math.min(4.2, part.height),
      span = maxX - minX,
      midX = (minX + maxX) / 2,
      z = -maxN;
    const pierWidth = span * 0.085,
      lintelHeight = 0.5;
    for (const x of [minX + pierWidth / 2, midX, maxX - pierWidth / 2]) {
      const pier = new Mesh(
        new BoxGeometry(pierWidth, portalHeight, 0.55),
        material("#bcbbae"),
      );
      pier.position.set(x, part.baseHeight + portalHeight / 2, z);
      group.add(pier);
    }
    const lintel = new Mesh(
      new BoxGeometry(span, 0.5, 0.65),
      material("#c9c8b9"),
    );
    lintel.position.set(midX, part.baseHeight + portalHeight - 0.25, z);
    group.add(lintel);
    for (const x of [midX - span * 0.245, midX + span * 0.245]) {
      const opening = new Mesh(
        new PlaneGeometry(span * 0.36, portalHeight - lintelHeight - 0.15),
        material("#182522"),
      );
      opening.position.set(
        x,
        part.baseHeight + (portalHeight - lintelHeight) / 2,
        z - 0.08,
      );
      group.add(opening);
    }
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 64;
    const signContext = signCanvas.getContext("2d")!;
    signContext.fillStyle = "#d0d1c0";
    signContext.fillRect(0, 0, 512, 64);
    signContext.fillStyle = "#25402f";
    signContext.font = "bold 42px sans-serif";
    signContext.textAlign = "center";
    signContext.fillText("PARKING", 256, 47);
    const signTexture = new CanvasTexture(signCanvas);
    signTexture.colorSpace = SRGBColorSpace;
    const signMaterial = material("#fffefe");
    signMaterial.map = signTexture;
    const sign = new Mesh(new PlaneGeometry(5.5, 0.55), signMaterial);
    sign.position.set(midX, part.baseHeight + portalHeight - 0.24, z + 0.35);
    group.add(sign);
    const shape = new Shape(part.footprint.map(([x, n]) => new Vector2(x, n))),
      geometry = new ExtrudeGeometry(shape, {
        depth: 0.055,
        bevelEnabled: false,
      });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, part.baseHeight + 0.12, 0);
    group.add(new Mesh(geometry, material("#545952")));
    for (const x of [minX + 0.4, maxX - 0.4]) {
      const line = new Mesh(
        new BoxGeometry(0.15, 0.06, maxN - minN),
        material("#e9e4cf"),
      );
      line.position.set(x, part.baseHeight + 0.2, -(minN + maxN) / 2);
      group.add(line);
    }
    const arrow = new Shape([
        new Vector2(-0.55, 0),
        new Vector2(0.55, 0),
        new Vector2(0.55, 2),
        new Vector2(1.2, 2),
        new Vector2(0, 3.4),
        new Vector2(-1.2, 2),
        new Vector2(-0.55, 2),
      ]),
      arrowGeometry = new ExtrudeGeometry(arrow, {
        depth: 0.015,
        bevelEnabled: false,
      });
    arrowGeometry.rotateX(-Math.PI / 2);
    arrowGeometry.translate(
      (minX + maxX) / 2,
      part.baseHeight + 0.2,
      -(minN + maxN) / 2,
    );
    group.add(new Mesh(arrowGeometry, material("#eee9dc")));
    return true;
  }
  return false;
}

function addVerifiedDetails(group: Group, part: BuildingPart) {
  const minX = Math.min(...part.footprint.map((p) => p[0]));
  const maxX = Math.max(...part.footprint.map((p) => p[0]));
  const minN = Math.min(...part.footprint.map((p) => p[1]));
  const maxN = Math.max(...part.footprint.map((p) => p[1]));
  const sideGroup = (side: string) => {
    const result = new Group();
    result.position.set(
      side === "east" ? maxX : side === "west" ? minX : 0,
      part.baseHeight,
      -(side === "north" ? maxN : side === "south" ? minN : 0),
    );
    result.rotation.y =
      side === "east"
        ? Math.PI / 2
        : side === "west"
          ? -Math.PI / 2
          : side === "north"
            ? Math.PI
            : 0;
    group.add(result);
    return result;
  };
  const columnLocations = new Set<string>();
  if (part.photoBayWindows) {
    const descriptor = part.photoBayWindows,
      front = sideGroup(descriptor.side);
    const sign =
      descriptor.side === "north" || descriptor.side === "west" ? -1 : 1;
    for (const row of descriptor.rows)
      for (const center of row.centers) {
        const window = new Group();
        window.position.set(sign * center, row.bottom, 0);
        const depth = row.projected ? descriptor.projectionDepth : 0.08;
        const pane = new Mesh(
          new BoxGeometry(row.width, row.height, 0.055),
          material("#3b5052", 0.25),
        );
        pane.position.set(0, row.height / 2, depth);
        window.add(pane);
        if (row.projected)
          for (const direction of [-1, 1]) {
            const sidePane = new Mesh(
              new BoxGeometry(0.055, row.height, descriptor.sidePaneWidth),
              material("#3b5052", 0.25),
            );
            sidePane.position.set(
              (direction * row.width) / 2,
              row.height / 2,
              depth - descriptor.sidePaneWidth / 2,
            );
            window.add(sidePane);
          }
        for (const direction of [-1, 1]) {
          // Projected returns are glazed between front/rear jambs. A full-depth
          // opaque side slab would enclose and hide the existing side pane.
          const frameDepth = row.projected ? descriptor.frameWidth : depth + 0.08;
          const frameCenters = row.projected
            ? [depth - descriptor.sidePaneWidth + frameDepth / 2, depth - frameDepth / 2]
            : [depth / 2];
          for (const frameCenter of frameCenters) {
            const frame = new Mesh(
              new BoxGeometry(
                descriptor.frameWidth,
                row.height + 0.16,
                frameDepth,
              ),
              material("#d6d5c9"),
            );
            frame.position.set(
              direction * (row.width / 2 + 0.04),
              row.height / 2,
              frameCenter,
            );
            window.add(frame);
          }
        }
        for (const height of [-0.04, row.height + 0.04]) {
          const cap = new Mesh(
            new BoxGeometry(
              row.width + 0.18,
              descriptor.frameWidth,
              depth + 0.16,
            ),
            material("#d6d5c9"),
          );
          cap.position.set(0, height, depth / 2);
          window.add(cap);
        }
        const mullion = new Mesh(
          new BoxGeometry(0.05, row.height, 0.06),
          material("#929b93"),
        );
        mullion.position.set(0, row.height / 2, depth + 0.04);
        window.add(mullion);
        front.add(window);
      }
  }
  if (part.colonnadeTreatment?.upperParapet) {
    const descriptor = part.colonnadeTreatment.upperParapet,
      side = part.facadeSide ?? part.columnSide ?? "south",
      front = sideGroup(side);
    const horizontal = side === "north" || side === "south",
      span = horizontal ? maxX - minX : maxN - minN,
      center = horizontal ? (minX + maxX) / 2 : (minN + maxN) / 2;
    const parapet = new Mesh(
      new BoxGeometry(span, descriptor.height, descriptor.depth),
      material(descriptor.color),
    );
    parapet.position.set(
      (side === "north" || side === "west" ? -1 : 1) * center,
      descriptor.bottom + descriptor.height / 2,
      0.12,
    );
    front.add(parapet);
  }
  for (const screen of part.facadeScreens ?? []) {
    const front = sideGroup(screen.side),
      sign = screen.side === "north" || screen.side === "west" ? -1 : 1;
    const panel = new Group();
    panel.position.set(
      sign * screen.center,
      screen.bottom + screen.height / 2,
      0.16,
    );
    panel.add(
      new Mesh(
        new BoxGeometry(screen.width, screen.height, 0.04),
        material("#3b3530"),
      ),
    );
    for (const slope of [-1, 1])
      for (
        let offset = -screen.width - screen.height;
        offset < screen.width + screen.height;
        offset += 0.28
      ) {
        const points: Vector3[] = [];
        for (const x of [-screen.width / 2, screen.width / 2]) {
          const y = slope * x + offset;
          if (Math.abs(y) <= screen.height / 2)
            points.push(new Vector3(x, y, 0.07));
        }
        for (const y of [-screen.height / 2, screen.height / 2]) {
          const x = (y - offset) / slope;
          if (Math.abs(x) <= screen.width / 2)
            points.push(new Vector3(x, y, 0.07));
        }
        if (points.length >= 2) {
          const start = points[0],
            end = points[1],
            direction = end.clone().sub(start);
          if (direction.lengthSq() < 1e-8) continue;
          const bar = new Mesh(
            new BoxGeometry(direction.length(), 0.035, 0.045),
            material(screen.color),
          );
          bar.position.copy(start.clone().add(end).multiplyScalar(0.5));
          bar.quaternion.setFromUnitVectors(
            new Vector3(1, 0, 0),
            direction.normalize(),
          );
          panel.add(bar);
        }
      }
    front.add(panel);
  }
  for (const colonnade of part.colonnades ?? []) {
    const front = sideGroup(colonnade.side);
    const horizontal = colonnade.side === "south" || colonnade.side === "north";
    const sign =
      colonnade.side === "north" || colonnade.side === "west" ? -1 : 1;
    const span = horizontal ? maxX - minX : maxN - minN,
      center = horizontal ? (minX + maxX) / 2 : (minN + maxN) / 2;
    for (const coordinate of colonnade.positions) {
      const column = new Mesh(
        new BoxGeometry(
          colonnade.width,
          part.height - (colonnade.baseHeight ?? 0),
          colonnade.width,
        ),
        material("#eee9dc"),
      );
      column.position.set(
        sign * coordinate,
        (part.height + (colonnade.baseHeight ?? 0)) / 2,
        0,
      );
      front.updateMatrixWorld(true);
      const world = column.position.clone().applyMatrix4(front.matrixWorld);
      const key = `${world.x.toFixed(2)}/${world.z.toFixed(2)}`;
      if (!columnLocations.has(key)) {
        front.add(column);
        columnLocations.add(key);
      } else column.geometry.dispose();
    }
    for (const height of [0.15, part.height - 0.15]) {
      const slab = new Mesh(
        new BoxGeometry(span, 0.3, colonnade.depth + 0.5),
        material("#c6c4b8"),
      );
      slab.position.set(sign * center, height, -colonnade.depth / 2 + 0.1);
      front.add(slab);
    }
  }
  if (part.roundedPilasters) {
    const descriptor = part.roundedPilasters,
      front = sideGroup(descriptor.side);
    const sign =
      descriptor.side === "north" || descriptor.side === "west" ? -1 : 1;
    for (const centre of descriptor.centers) {
      const pilaster = new Mesh(
        new CylinderGeometry(
          descriptor.radius,
          descriptor.radius,
          descriptor.top - descriptor.bottom,
          16,
        ),
        material(part.wallColor),
      );
      pilaster.position.set(
        sign * centre,
        (descriptor.top + descriptor.bottom) / 2,
        0,
      );
      front.add(pilaster);
    }
  }
  if (part.meanderBands) {
    const descriptor = part.meanderBands,
      front = sideGroup(descriptor.side);
    const width =
      descriptor.side === "east" || descriptor.side === "west"
        ? maxN - minN
        : maxX - minX;
    const center =
      descriptor.side === "east" || descriptor.side === "west"
        ? (minN + maxN) / 2
        : (minX + maxX) / 2;
    const sign =
      descriptor.side === "north" || descriptor.side === "west" ? -1 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = part.wallColor;
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = descriptor.color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(112, 52);
    ctx.lineTo(112, 12);
    ctx.lineTo(28, 12);
    ctx.lineTo(28, 36);
    ctx.lineTo(86, 36);
    ctx.stroke();
    const map = new CanvasTexture(canvas);
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(width / descriptor.moduleWidth, 1);
    map.colorSpace = SRGBColorSpace;
    const bandMaterial = new MeshStandardMaterial({ map, roughness: 0.9 });
    const band = new Mesh(
      new PlaneGeometry(width, descriptor.height),
      bandMaterial,
    );
    band.position.set(
      sign * center,
      descriptor.bottom + descriptor.height / 2,
      0.06,
    );
    front.add(band);
  }
  for (const opening of part.glazedOpenings ?? []) {
    const front = new Group();
    const angle =
      opening.side === "east"
        ? Math.PI / 2
        : opening.side === "west"
          ? -Math.PI / 2
          : opening.side === "north"
            ? Math.PI
            : 0;
    front.position.set(
      opening.side === "east"
        ? maxX
        : opening.side === "west"
          ? minX
          : opening.center,
      part.baseHeight + opening.bottom,
      -(opening.side === "north"
        ? maxN
        : opening.side === "south"
          ? minN
          : opening.center),
    );
    front.rotation.y = angle;
    const recess =
      part.colonnades?.find((face) => face.side === opening.side)?.depth ??
      (opening.side === (part.facadeSide ?? part.columnSide ?? "south")
        ? (part.porchDepth ?? 0)
        : 0);
    let paneMaterial = material("#35484b", 0.3);
    const sample = photoGlassTrial
      ? mainGlazingSamples.find(
          (sample) =>
            sample.partId === part.id &&
            sample.side === opening.side &&
            sample.center === opening.center &&
            sample.bottom === opening.bottom,
        )
      : undefined;
    if (sample) {
      paneMaterial = paneMaterial.clone();
      paneMaterial.map = null;
      paneMaterial.color.set(sample.candidateSrgb);
      paneMaterial.name = `main-photo-colour-proxy:${sample.id}`;
      paneMaterial.userData = {
        status: "adopted-observed-display-colour-estimate-not-physical-albedo",
        source: mainGlazingSource,
        sample,
      };
    }
    const pane = new Mesh(
      new BoxGeometry(opening.width, opening.height, 0.04),
      paneMaterial,
    );
    pane.position.set(0, opening.height / 2, 0.04 - recess);
    front.add(pane);
    for (let i = 0; i <= opening.panes; i++) {
      const mullion = new Mesh(
        new BoxGeometry(0.1, opening.height + 0.12, 0.12),
        material(opening.frameColor ?? "#b5b6ad"),
      );
      mullion.position.set(
        -opening.width / 2 + (opening.width * i) / opening.panes,
        opening.height / 2,
        0.1 - recess,
      );
      front.add(mullion);
    }
    for (const height of [0, opening.height]) {
      const frame = new Mesh(
        new BoxGeometry(opening.width + 0.1, 0.1, 0.12),
        material(opening.frameColor ?? "#b5b6ad"),
      );
      frame.position.set(0, height, 0.1 - recess);
      front.add(frame);
    }
    if(architecturalDetail){
      const sill=new Mesh(new BoxGeometry(opening.width+0.24,0.095,0.31),facadeMaterial('#cecfc5','stone'));
      sill.position.set(0,-0.04,0.16-recess);front.add(sill);
    }
    group.add(front);
  }
  if (part.balconyStacks) {
    const stack = part.balconyStacks,
      side = stack.side;
    const horizontal = side === "north" || side === "south",
      span = horizontal ? maxX - minX : maxN - minN;
    const front = new Group();
    front.position.set(
      side === "east" ? maxX : side === "west" ? minX : (minX + maxX) / 2,
      part.baseHeight,
      -(side === "north" ? maxN : side === "south" ? minN : (minN + maxN) / 2),
    );
    front.rotation.y =
      side === "east"
        ? Math.PI / 2
        : side === "west"
          ? -Math.PI / 2
          : side === "north"
            ? Math.PI
            : 0;
    const masonry = brickMaterial(part.wallColor);
    const block = (x0: number, x1: number, y0: number, y1: number) => {
      if (x1 <= x0 || y1 <= y0) return;
      const mesh = new Mesh(
        new BoxGeometry(x1 - x0, y1 - y0, stack.recessDepth),
        masonry,
      );
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, -stack.recessDepth / 2);
      front.add(mesh);
    };
    const bayWidth = span / stack.bays;
    const intervalGap = (bayWidth - stack.openingWidth) / 2;
    block(-span / 2, -span / 2 + intervalGap, 0, part.height);
    for (let bay = 0; bay < stack.bays; bay++) {
      const centre = bayWidth * (bay + 0.5) - span / 2,
        start = centre - stack.openingWidth / 2,
        end = centre + stack.openingWidth / 2;
      if (bay < stack.bays - 1) block(end, start + bayWidth, 0, part.height);
      else block(end, span / 2, 0, part.height);
      let previousTop = 0;
      stack.floorHeights.forEach((floor, row) => {
        block(start, end, previousTop, floor);
        previousTop = floor + stack.openingHeight;
        const pane = new Mesh(
          new BoxGeometry(stack.openingWidth, stack.openingHeight, 0.08),
          material("#3b5052", 0.25),
        );
        pane.position.set(
          centre,
          floor + stack.openingHeight / 2,
          -stack.recessDepth + 0.1,
        );
        front.add(pane);
        for (let i = 0; i <= stack.doorPanels; i++) {
          const frame = new Mesh(
            new BoxGeometry(0.08, stack.openingHeight, 0.11),
            material("#bdc2b5"),
          );
          frame.position.set(
            start + (stack.openingWidth * i) / stack.doorPanels,
            floor + stack.openingHeight / 2,
            -stack.recessDepth + 0.16,
          );
          front.add(frame);
        }
        if (!stack.railedRows.includes(row)) return;
        const slab = new Mesh(
          new BoxGeometry(
            stack.openingWidth + 0.12,
            stack.fasciaHeight,
            stack.recessDepth + 0.35,
          ),
          material("#d8d5c9"),
        );
        slab.position.set(
          centre,
          floor - stack.fasciaHeight / 2,
          -stack.recessDepth / 2 + 0.15,
        );
        front.add(slab);
        const handrail = new Mesh(
          new BoxGeometry(stack.openingWidth, 0.06, 0.07),
          material("#989f95"),
        );
        handrail.position.set(centre, floor + stack.railHeight, 0.35);
        front.add(handrail);
        const posts = Math.ceil(stack.openingWidth / 0.35);
        for (let j = 0; j <= posts; j++) {
          const post = new Mesh(
            new BoxGeometry(0.035, stack.railHeight, 0.04),
            material("#989f95"),
          );
          post.position.set(
            start + (stack.openingWidth * j) / posts,
            floor + stack.railHeight / 2,
            0.35,
          );
          front.add(post);
        }
      });
      block(start, end, previousTop, part.height);
    }
    group.add(front);
  }
  if (part.veranda) {
    const { side, depth, floorHeight, railingHeight } = part.veranda;
    const horizontal = side === "north" || side === "south";
    const span = horizontal ? maxX - minX : maxN - minN;
    const veranda = new Group();
    veranda.position.set(
      side === "east" ? maxX : side === "west" ? minX : (minX + maxX) / 2,
      part.baseHeight + floorHeight,
      -(side === "north" ? maxN : side === "south" ? minN : (minN + maxN) / 2),
    );
    veranda.rotation.y =
      side === "east"
        ? Math.PI / 2
        : side === "west"
          ? -Math.PI / 2
          : side === "north"
            ? Math.PI
            : 0;
    const deck = new Mesh(
      new BoxGeometry(span + 0.5, 0.22, depth + 0.5),
      material("#aa7c43"),
    );
    deck.position.set(0, -0.11, -depth / 2 + 0.15);
    veranda.add(deck);
    for (const h of [0.14, railingHeight]) {
      const rail = new Mesh(
        new BoxGeometry(span, 0.08, 0.09),
        material("#ba9459"),
      );
      rail.position.set(0, h, 0.32);
      veranda.add(rail);
    }
    const count = Math.ceil(span / 0.42);
    for (let i = 0; i <= count; i++) {
      const post = new Mesh(
        new BoxGeometry(0.055, railingHeight, 0.055),
        material("#b48a4e"),
      );
      post.position.set(span * (i / count - 0.5), railingHeight / 2, 0.32);
      veranda.add(post);
    }
    group.add(veranda);
  }
  if (part.framedGlazing) {
    const glazing = part.framedGlazing,
      side = glazing.side;
    const horizontal = side === "north" || side === "south";
    const span = horizontal ? maxX - minX : maxN - minN;
    const facade = new Group(),
      recess = part.porchDepth ?? 0;
    facade.position.set(
      side === "east"
        ? maxX - recess
        : side === "west"
          ? minX + recess
          : (minX + maxX) / 2,
      part.baseHeight,
      -(side === "north"
        ? maxN - recess
        : side === "south"
          ? minN + recess
          : (minN + maxN) / 2),
    );
    facade.rotation.y =
      side === "east"
        ? Math.PI / 2
        : side === "west"
          ? -Math.PI / 2
          : side === "north"
            ? Math.PI
            : 0;
    facade.translateZ(
      -(part.colonnades?.find((face) => face.side === side)?.depth ?? 0),
    );
    const sign = side === "north" || side === "west" ? -1 : 1;
    const bayWidth = span / glazing.bays;
    const openingWidth =
      (bayWidth - glazing.pierWidth * (glazing.openingsPerBay + 1)) /
      glazing.openingsPerBay;
    for (let bay = 0; bay < glazing.bays; bay++) {
      if (glazing.solidBays.includes(bay)) continue;
      for (let opening = 0; opening < glazing.openingsPerBay; opening++) {
        const along =
          -span / 2 +
          bayWidth * bay +
          glazing.pierWidth +
          (openingWidth + glazing.pierWidth) * opening +
          openingWidth / 2;
        for (const row of glazing.rows) {
          const frame = new Mesh(
            new BoxGeometry(openingWidth + 0.1, row.height + 0.1, 0.16),
            material("#90998f"),
          );
          frame.position.set(sign * along, row.bottom + row.height / 2, 0.1);
          facade.add(frame);
          const pane = new Mesh(
            new BoxGeometry(openingWidth, row.height, 0.08),
            material("#3b5052", 0.25),
          );
          pane.position.set(sign * along, row.bottom + row.height / 2, 0.2);
          facade.add(pane);
          for (let i = 1; i < glazing.panesPerOpening; i++) {
            const mullion = new Mesh(
              new BoxGeometry(0.06, row.height, 0.07),
              material("#959e92"),
            );
            mullion.position.set(
              sign *
                (along -
                  openingWidth / 2 +
                  (openingWidth * i) / glazing.panesPerOpening),
              row.bottom + row.height / 2,
              0.25,
            );
            facade.add(mullion);
          }
        }
      }
    }
    group.add(facade);
  }
  if (part.terraceRailing) {
    const top = part.baseHeight + part.height + part.roof.height;
    for (const side of part.terraceRailing.sides) {
      const horizontal = side === "north" || side === "south";
      const span = horizontal ? maxX - minX : maxN - minN;
      const railing = new Group();
      railing.position.set(
        horizontal ? (minX + maxX) / 2 : side === "east" ? maxX : minX,
        top,
        horizontal ? -(side === "north" ? maxN : minN) : -(minN + maxN) / 2,
      );
      railing.rotation.y = horizontal ? 0 : Math.PI / 2;
      const h = part.terraceRailing.height;
      for (const y of [0.18, h]) {
        const rail = new Mesh(
          new BoxGeometry(span, 0.045, 0.045),
          material("#818d88", 0.15),
        );
        rail.position.y = y;
        railing.add(rail);
      }
      const count = Math.ceil(span / 1.2);
      for (let i = 0; i <= count; i++) {
        const post = new Mesh(
          new BoxGeometry(0.045, h, 0.045),
          material("#818d88", 0.15),
        );
        post.position.set(span * (i / count - 0.5), h / 2, 0);
        railing.add(post);
      }
      group.add(railing);
    }
  }
  for (const layout of part.windowLayouts ?? []) {
    const facade = new Group();
    const side = layout.side;
    const horizontal = side === "north" || side === "south";
    const span = horizontal ? maxX - minX : maxN - minN;
    const recess = side === part.facadeSide ? (part.porchDepth ?? 0) : 0;
    facade.position.set(
      side === "east"
        ? maxX - recess
        : side === "west"
          ? minX + recess
          : (minX + maxX) / 2,
      part.baseHeight,
      -(side === "north"
        ? maxN - recess
        : side === "south"
          ? minN + recess
          : (minN + maxN) / 2),
    );
    facade.rotation.y =
      side === "east"
        ? Math.PI / 2
        : side === "west"
          ? -Math.PI / 2
          : side === "north"
            ? Math.PI
            : 0;
    facade.translateZ(
      -(part.colonnades?.find((face) => face.side === side)?.depth ?? 0),
    );
    const interval = span / (layout.bays + 1);
    for (const sill of layout.sillHeights)
      for (let i = 0; i < (layout.centers?.length ?? layout.bays); i++) {
        const width =
          layout.endWindowWidth && (i === 0 || i === layout.bays - 1)
            ? layout.endWindowWidth
            : layout.width;
        const absoluteCenter = layout.centers?.[i];
        const x =
          absoluteCenter === undefined
            ? interval * (i + 1) - span / 2
            : (side === "north" || side === "west" ? -1 : 1) *
              (absoluteCenter -
                (side === "east" || side === "west"
                  ? (minN + maxN) / 2
                  : (minX + maxX) / 2));
        const backing = new Mesh(
          new BoxGeometry(width + 0.16, layout.height + 0.16, 0.12),
          material("#c6c8bd"),
        );
        backing.position.set(x, sill + layout.height / 2, 0.08);
        facade.add(backing);
        const glazing = new Mesh(
          new BoxGeometry(width, layout.height, 0.08),
          material("#3b5052", 0.25),
        );
        glazing.position.set(x, sill + layout.height / 2, 0.17);
        glazing.userData.photoPartId = part.id;
        glazing.userData.photoSurface = "glass";
        facade.add(glazing);
        if (layout.transom) {
          const lowerHeight =
            layout.height * (1 - layout.transom.upperFraction);
          const horizontal = new Mesh(
            new BoxGeometry(width, 0.065, 0.08),
            material("#8c9690"),
          );
          horizontal.position.set(x, sill + lowerHeight, 0.23);
          facade.add(horizontal);
          let fraction = 0;
          for (const portion of layout.transom.lowerFractions.slice(0, -1)) {
            fraction += portion;
            const mullion = new Mesh(
              new BoxGeometry(0.055, lowerHeight, 0.08),
              material("#8c9690"),
            );
            mullion.position.set(
              x - width / 2 + width * fraction,
              sill + lowerHeight / 2,
              0.23,
            );
            facade.add(mullion);
          }
          fraction = 0;
          for (const portion of layout.transom.upperFractions?.slice(0, -1) ??
            []) {
            fraction += portion;
            const mullion = new Mesh(
              new BoxGeometry(0.055, layout.height - lowerHeight, 0.08),
              material("#8c9690"),
            );
            mullion.position.set(
              x - width / 2 + width * fraction,
              sill + lowerHeight + (layout.height - lowerHeight) / 2,
              0.23,
            );
            facade.add(mullion);
          }
        } else
          for (let j = 1; j <= layout.mullions; j++) {
            const mullion = new Mesh(
              new BoxGeometry(0.055, layout.height, 0.08),
              material("#8c9690"),
            );
            mullion.position.set(
              x - width / 2 + (width * j) / (layout.mullions + 1),
              sill + layout.height / 2,
              0.23,
            );
            facade.add(mullion);
          }
        if (layout.lattice?.pattern === "octagon") {
          const cellWidth = width / layout.lattice.columns,
            cellHeight = layout.height / layout.lattice.rows;
          for (let row = 0; row < layout.lattice.rows; row++)
            for (let column = 0; column < layout.lattice.columns; column++) {
              const cx = x - width / 2 + cellWidth * (column + 0.5),
                cy = sill + cellHeight * (row + 0.5);
              for (let edge = 0; edge < 8; edge++) {
                const a = ((edge + 0.5) * Math.PI) / 4,
                  b = ((edge + 1.5) * Math.PI) / 4;
                const start = new Vector3(
                  cx + Math.cos(a) * cellWidth * 0.43,
                  cy + Math.sin(a) * cellHeight * 0.43,
                  0.25,
                );
                const end = new Vector3(
                    cx + Math.cos(b) * cellWidth * 0.43,
                    cy + Math.sin(b) * cellHeight * 0.43,
                    0.25,
                  ),
                  direction = end.clone().sub(start);
                const bar = new Mesh(
                  new BoxGeometry(direction.length(), 0.035, 0.035),
                  material("#817e69", 0.3),
                );
                bar.position.copy(start.clone().add(end).multiplyScalar(0.5));
                bar.quaternion.setFromUnitVectors(
                  new Vector3(1, 0, 0),
                  direction.normalize(),
                );
                facade.add(bar);
              }
            }
        }
      }
    for (const height of layout.floorBands ?? []) {
      const band = new Mesh(
        new BoxGeometry(span, 0.16, 0.14),
        material("#b7bcb4"),
      );
      band.position.set(0, height, 0.17);
      facade.add(band);
    }
    group.add(facade);
  }
  if (part.rooftop) {
    const top = part.baseHeight + part.height + part.roof.height;
    part.footprint.forEach((a, i) => {
      const b = part.footprint[(i + 1) % part.footprint.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const parapet = new Mesh(
        new BoxGeometry(length, part.rooftop!.parapetHeight, 0.22),
        material("#e9e7db"),
      );
      parapet.position.set(
        (a[0] + b[0]) / 2,
        top + part.rooftop!.parapetHeight / 2,
        -(a[1] + b[1]) / 2,
      );
      parapet.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]);
      group.add(parapet);
    });
    for (let i = 0; i < part.rooftop.skylights; i++) {
      const x = minX + ((maxX - minX) * (i + 1)) / (part.rooftop.skylights + 1);
      const curb = new Mesh(
        new BoxGeometry(2.5, 0.35, 1.8),
        material("#e0e0d3"),
      );
      curb.position.set(x, top + 0.17, -(minN + maxN) / 2);
      group.add(curb);
      const glass = new Mesh(
        new BoxGeometry(2.25, 0.08, 1.55),
        material("#40595b", 0.25),
      );
      glass.position.set(x, top + 0.39, -(minN + maxN) / 2);
      group.add(glass);
    }
  }
  for (const facade of part.facades ?? []) {
    if (facade.style === "archive-fins") {
      if (facade.side !== part.facadeSide)
        addFacade(group, {
          ...part,
          facadeSide: facade.side,
          facadeStyle: "archive-fins",
          facadeBays: facade.bays,
          facades: undefined,
        });
      continue;
    }
    const horizontal = facade.side === "north" || facade.side === "south";
    const span = horizontal ? maxX - minX : maxN - minN;
    const rows = facade.rows ?? 3,
      bays = facade.bays ?? 7;
    for (let row = 0; row < rows; row++)
      for (let bay = 0; bay < bays; bay++) {
        const along = (span * (bay + 1)) / (bays + 1);
        const window = new Mesh(
          new BoxGeometry(0.52, 1.6, 0.12),
          material("#3b5052", 0.25),
        );
        window.rotation.y = horizontal ? 0 : Math.PI / 2;
        window.position.set(
          horizontal
            ? minX + along
            : facade.side === "east"
              ? maxX + 0.07
              : minX - 0.07,
          part.baseHeight + 2.1 + (row * (part.height - 3)) / rows,
          horizontal
            ? -(facade.side === "north" ? maxN + 0.07 : minN - 0.07)
            : -(minN + along),
        );
        group.add(window);
      }
  }
}

/** The photographed entrance canopy is open beneath its tiled roof. */
function addGraduateOpenEntryTrial(group: Group, part: BuildingPart) {
  const minX = Math.min(...part.footprint.map((point) => point[0]));
  const maxX = Math.max(...part.footprint.map((point) => point[0]));
  const south = Math.min(...part.footprint.map((point) => point[1]));
  const width = maxX - minX, center = (minX + maxX) / 2;
  const recess = part.porchDepth ?? 0, floor = part.entrance?.rise ?? 0.8;
  addRoof(group, part, part.roof.surface === "metal");
  // Preserve the existing porch floor and its immediately-below-roof ceiling slab.
  const floorSlab = new Mesh(new BoxGeometry(width, 0.35, recess + 1), material("#b3b1a5"));
  floorSlab.position.set(center, part.baseHeight + floor - 0.17, -south - recess / 2 + 0.4);
  group.add(floorSlab);
  const soffit = new Mesh(new BoxGeometry(width, 0.32, recess + 0.7), material("#bcbcaf"));
  soffit.position.set(center, part.baseHeight + part.height - 0.16, -south - recess / 2 + 0.3);
  group.add(soffit);
  // Keep the existing explicit supports, including their estimated section and positions.
  for (let index = 0; index < (part.columnCount ?? 0); index++) {
    const base = part.columnBaseHeight ?? part.entrance?.rise ?? 0;
    const support = new Mesh(
      new BoxGeometry(sideColumnWidth(part), part.height - base, sideColumnWidth(part)),
      material("#eee9dc"),
    );
    support.position.set(
      part.columnPositions?.[index] ?? minX + (maxX - minX) * index / Math.max(1, (part.columnCount ?? 0) - 1),
      part.baseHeight + (part.height + base) / 2,
      -south + 0.5,
    );
    group.add(support);
  }
}

export async function createBuildingGlb(
  building: GeographicBuilding,
  groundProfile?: BuildingGroundProfile,
  options: BuildModelOptions = {},
): Promise<string> {
  const {
    enablePhotoPatches = false,
    enableMaterialTrial = false,
    enableEnvironmentGlass = false,
  } = options;
  neutralRoofTrial = options.neutralRoof;
  continuousRoofTrial = options.continuousRoofUV ?? true;
  photoGlassTrial =
    (options.photoGlazing ?? !enableEnvironmentGlass) && building.id === "main";
  softRoofPatternTrial = options.softRoofPattern ?? true;
  syntheticGlassPattern = options.syntheticGlassPattern ?? false;
  translucentWaterTrial = options.translucentWater ?? false;
  architecturalDetail = options.architecturalDetail ?? true;
  hakuCurvedRoofTrial = options.hakuCurvedRoof === true && building.id === hakuRoofProfileTrial.buildingId;
  const group = new Group();
  environmentGlassTrial = enableEnvironmentGlass && building.id === "main";
  materialCache.clear();
  roofTextures.clear();
  reflectionTexture = undefined;
  group.name = building.name;
  let trialWallMaterial: MeshStandardMaterial | undefined;
  if (enableMaterialTrial && building.id === "main") {
    const loader = new TextureLoader();
    const [map, normalMap, roughnessMap] = await Promise.all(
      ["diff", "nor_gl", "rough"].map((channel) =>
        loader.loadAsync(`/materials/white_plaster_02_${channel}_1k.jpg`),
      ),
    );
    map.colorSpace = SRGBColorSpace;
    for (const texture of [map, normalMap, roughnessMap])
      texture.wrapS = texture.wrapT = RepeatWrapping;
    trialWallMaterial = new MeshStandardMaterial({
      color: building.parts[0].wallColor,
      map,
      normalMap,
      roughnessMap,
      roughness: 1,
    });
    trialWallMaterial.name = "stock-white-plaster-trial";
  }
  if (building.site?.access) {
    const access = building.site.access;
    const landingShape = new Shape(
      access.landing.outline.map(([e, n]) => new Vector2(e, n)),
    );
    const landingGeometry = new ExtrudeGeometry(landingShape, {
      depth: 0.18,
      bevelEnabled: false,
    });
    landingGeometry.rotateX(-Math.PI / 2);
    landingGeometry.translate(0, access.landing.elevation - 0.18, 0);
    group.add(new Mesh(landingGeometry, material("#b5b3a8")));
    const stairs = access.stairs;
    const bottom =
      groundProfile?.accessStairGroundHeight ?? stairs.bottomHeight;
    const vector = new Vector3(
      stairs.end[0] - stairs.start[0],
      0,
      -(stairs.end[1] - stairs.start[1]),
    );
    const length = vector.length(),
      direction = vector.clone().normalize();
    for (let i = 0; i < stairs.steps; i++) {
      const top =
        stairs.topHeight + ((bottom - stairs.topHeight) * i) / stairs.steps;
      const height = Math.max(0.04, top - bottom);
      const step = new Mesh(
        new BoxGeometry(length / stairs.steps + 0.01, height, stairs.width),
        material("#b5b3a8"),
      );
      step.position.set(
        stairs.start[0] + (direction.x * length * (i + 0.5)) / stairs.steps,
        bottom + height / 2,
        -stairs.start[1] + (direction.z * length * (i + 0.5)) / stairs.steps,
      );
      step.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), direction);
      group.add(step);
    }
    for (const sign of [-1, 1]) {
      const lateral = new Vector3(-direction.z, 0, direction.x).multiplyScalar(
        (sign * stairs.width) / 2,
      );
      const start = new Vector3(
        stairs.start[0],
        stairs.topHeight + access.railHeight,
        -stairs.start[1],
      ).add(lateral);
      const end = new Vector3(
        stairs.end[0],
        bottom + access.railHeight,
        -stairs.end[1],
      ).add(lateral);
      const railVector = end.clone().sub(start);
      const rail = new Mesh(
        new BoxGeometry(railVector.length(), 0.055, 0.055),
        material("#606863", 0.3),
      );
      rail.position.copy(start.clone().add(end).multiplyScalar(0.5));
      rail.quaternion.setFromUnitVectors(
        new Vector3(1, 0, 0),
        railVector.normalize(),
      );
      group.add(rail);
    }
  }
  if (building.site?.water) {
    const water = building.site.water;
    const shape = new Shape(water.outline.map(([e, n]) => new Vector2(e, n)));
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.025,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, water.elevation, 0);
    metricWaterUv(geometry);
    const surface = calmWaterMaterial(water.color);
    group.add(new Mesh(geometry, surface));
  }
  if (building.site?.steppedApproach) addHakuSteppedApproach(group, building.site.steppedApproach);
  if (building.site?.bridge) {
    const { start, end, width, elevation } = building.site.bridge;
    const direction = new Vector3(end[0] - start[0], 0, -(end[1] - start[1]));
    const deck = new Mesh(
      new BoxGeometry(direction.length(), 0.16, width),
      material("#a69b7e"),
    );
    deck.position.set(
      (start[0] + end[0]) / 2,
      elevation - 0.08,
      -(start[1] + end[1]) / 2,
    );
    deck.quaternion.setFromUnitVectors(
      new Vector3(1, 0, 0),
      direction.clone().normalize(),
    );
    group.add(deck);
    // Elevation is the walking surface. Ground sampling supports the terminal
    // abutment rather than turning the whole photographed approach into a ramp.
    const axis = direction.clone().normalize();
    const ground = groundProfile?.bridgeLandingHeight ?? elevation - 0.16;
    const bottom = Math.min(ground - 0.08, elevation - 0.18);
    const supportHeight = elevation - 0.16 - bottom;
    const supportLength = Math.min(1, direction.length());
    const abutment = new Mesh(
      new BoxGeometry(supportLength, supportHeight, width),
      material("#b4b2a4"),
    );
    abutment.position.set(
      end[0] - (axis.x * supportLength) / 2,
      bottom + supportHeight / 2,
      -end[1] - (axis.z * supportLength) / 2,
    );
    abutment.quaternion.copy(deck.quaternion);
    group.add(abutment);
  }
  for (const part of building.parts) {
    if (addFeaturePart(group, building, part, options.hakuGeometry)) continue;
    if (options.graduateEntry === "open" && building.id === "graduate-school" && part.id === "graduate-entry-roof") {
      addGraduateOpenEntryTrial(group, part);
      continue;
    }
    const terrainPart = groundProfile?.parts[part.id];
    if (
      (part.baseHeight === 0 || part.foundationToGround === true) &&
      terrainPart &&
      !["pond", "pavilion", "underground-parking"].includes(
        building.kind ?? "building",
      )
    ) {
      const vertices: number[] = [];
      const footprint = bodyFootprint(part);
      for (let i = 0; i < footprint.length; i++) {
        const j = (i + 1) % footprint.length;
        const a = footprint[i],
          b = footprint[j];
        const lowerA = Math.min(
          part.baseHeight,
          (terrainPart.edgeHeights[i] ?? 0) - 0.25,
        );
        const lowerB = Math.min(
          part.baseHeight,
          (terrainPart.edgeHeights[j] ?? 0) - 0.25,
        );
        vertices.push(
          a[0],
          part.baseHeight,
          -a[1],
          b[0],
          lowerB,
          -b[1],
          b[0],
          part.baseHeight,
          -b[1],
          a[0],
          part.baseHeight,
          -a[1],
          a[0],
          lowerA,
          -a[1],
          b[0],
          lowerB,
          -b[1],
        );
      }
      const skirt = new BufferGeometry();
      skirt.setAttribute("position", new Float32BufferAttribute(vertices, 3));
      skirt.computeVertexNormals();
      if(architecturalDetail)architecturalUv(skirt);
      group.add(new Mesh(skirt, architecturalDetail?facadeMaterial('#9b978c','stone'):material("#9b978c")));
    }
    if (part.pillarProfile) {
      const minE = Math.min(...part.footprint.map((p) => p[0])),
        maxE = Math.max(...part.footprint.map((p) => p[0]));
      const minN = Math.min(...part.footprint.map((p) => p[1])),
        maxN = Math.max(...part.footprint.map((p) => p[1]));
      const { bend, taper, segments } = part.pillarProfile;
      const ring = (height: number) => {
        const t = height / part.height,
          halfE = ((maxE - minE) / 2) * (1 - taper * t),
          halfN = ((maxN - minN) / 2) * (1 - taper * t);
        const centreE = (minE + maxE) / 2 + bend * t * t,
          centreN = (minN + maxN) / 2;
        return [
          [centreE - halfE, part.baseHeight + height, -centreN + halfN],
          [centreE + halfE, part.baseHeight + height, -centreN + halfN],
          [centreE + halfE, part.baseHeight + height, -centreN - halfN],
          [centreE - halfE, part.baseHeight + height, -centreN - halfN],
        ];
      };
      for (let section = 0; section < segments; section++) {
        const lower = ring((part.height * section) / segments + 0.015),
          upper = ring((part.height * (section + 1)) / segments - 0.015);
        const vertices: number[] = [];
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          vertices.push(
            ...lower[i],
            ...lower[j],
            ...upper[j],
            ...lower[i],
            ...upper[j],
            ...upper[i],
          );
        }
        vertices.push(
          ...upper[0],
          ...upper[1],
          ...upper[2],
          ...upper[0],
          ...upper[2],
          ...upper[3],
        );
        const geometry = new BufferGeometry();
        geometry.setAttribute(
          "position",
          new Float32BufferAttribute(vertices, 3),
        );
        geometry.computeVertexNormals();
        group.add(new Mesh(geometry, material(part.wallColor)));
      }
      continue;
    }
    const shape = new Shape(
      bodyFootprint(part).map(([x, n]) => new Vector2(x, n)),
    );
    const geometry = new ExtrudeGeometry(shape, {
      depth: part.height,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, part.baseHeight, 0);
    if (part.wallSurface === "brick") metricBrickUv(geometry);
    else if(architecturalDetail)architecturalUv(geometry);
    const bodyMesh = new Mesh(
      geometry,
      trialWallMaterial ??
        (part.wallSurface === "brick"
          ? brickMaterial(part.wallColor)
          : architecturalDetail?facadeMaterial(part.wallColor,building.id==='jangseogak'?'stone':'plaster'):material(part.wallColor)),
    );
    bodyMesh.userData.photoPartId = part.id;
    bodyMesh.userData.photoSurface = "cladding";
    group.add(bodyMesh);
    addRoof(
      group,
      part,
      part.roof.surface === "metal" || building.id === "jangseogak",
    );
    addWindows(group, part);
    addFacade(group, part, terrainPart?.entryGroundHeight);
    addVerifiedDetails(group, part);
    if (part.columnCount) {
      const columnSide = part.columnSide ?? part.facadeSide ?? "south";
      const [minX, maxX] = [
        Math.min(...part.footprint.map((p) => p[0])),
        Math.max(...part.footprint.map((p) => p[0])),
      ];
      const south = Math.min(...part.footprint.map((p) => p[1]));
      for (let i = 0; i < part.columnCount; i++) {
        const column = new Mesh(
          new BoxGeometry(
            sideColumnWidth(part),
            part.height - (part.columnBaseHeight ?? part.entrance?.rise ?? 0),
            sideColumnWidth(part),
          ),
          material(part.facadeStyle === "timber" ? "#aa7b42" : "#eee9dc"),
        );
        const north = Math.max(...part.footprint.map((p) => p[1]));
        const along = i / Math.max(1, part.columnCount - 1);
        column.position.set(
          columnSide === "east"
            ? maxX + 0.5
            : columnSide === "west"
              ? minX - 0.5
              : (part.columnPositions?.[i] ?? minX + (maxX - minX) * along),
          part.baseHeight +
            (part.height +
              (part.columnBaseHeight ?? part.entrance?.rise ?? 0)) /
              2,
          columnSide === "east" || columnSide === "west"
            ? -(part.columnPositions?.[i] ?? south + (north - south) * along)
            : columnSide === "north"
              ? -north - 0.5
              : -south + 0.5,
        );
        group.add(column);
      }
    }
  }
  // Static windows and structural pieces share materials. Bake transforms and
  // merge compatible geometry to keep draw calls in the tens rather than thousands.
  if (options.hakuPlaque === "photo") await addHakuPhotoPlaque(group, building);
  if ((options.hakuWoodTrial || options.hakuWoodNormalOnly || options.hakuWoodTinted) && building.id === pavilionDetails.buildingId)
    await applyHakuWoodTrial(group, options.hakuWoodNormalOnly === true, options.hakuWoodTinted === true);
  group.updateMatrixWorld(true);
  const batches = new Map<
    string,
    { material: MeshStandardMaterial; geometries: BufferGeometry[] }
  >();
  group.traverse((object) => {
    if (
      object instanceof Mesh &&
      object.material instanceof MeshStandardMaterial
    ) {
      let geometry = object.geometry.clone();
      if (geometry.index) {
        const nonIndexed = geometry.toNonIndexed();
        geometry.dispose();
        geometry = nonIndexed;
      }
      geometry.applyMatrix4(object.matrixWorld);
      if (object.material.name === "stock-white-plaster-trial") {
        const position = geometry.getAttribute("position"),
          normal = geometry.getAttribute("normal");
        const uv: number[] = [];
        for (let i = 0; i < position.count; i++)
          uv.push(
            Math.abs(normal.getX(i)) > 0.5
              ? -position.getZ(i)
              : position.getX(i),
            Math.abs(normal.getY(i)) > 0.5
              ? -position.getZ(i)
              : position.getY(i),
          );
        geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
      }
      if (enablePhotoPatches)
        for (const patch of photoPatches.filter(
          (patch) =>
            patch.buildingId === building.id &&
            patch.partId === object.userData.photoPartId &&
            patch.surface === object.userData.photoSurface,
        )) {
          const base = building.parts.find(
            (part) => part.id === patch.partId,
          )!.baseHeight;
          const clipped = subtractPhotoRegion(geometry, patch, base);
          geometry.dispose();
          geometry = clipped;
        }
      const sourcePositions = geometry.getAttribute("position");
      const kept: number[] = [];
      for (let i = 0; i < sourcePositions.count; i += 3) {
        const a = new Vector3().fromBufferAttribute(sourcePositions, i);
        const b = new Vector3().fromBufferAttribute(sourcePositions, i + 1);
        const c = new Vector3().fromBufferAttribute(sourcePositions, i + 2);
        if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-14)
          kept.push(i, i + 1, i + 2);
      }
      if (kept.length !== sourcePositions.count) {
        for (const [name, rawAttribute] of Object.entries(
          geometry.attributes,
        )) {
          const attribute = rawAttribute as BufferAttribute;
          const values: number[] = [];
          for (const index of kept)
            for (let component = 0; component < attribute.itemSize; component++)
              values.push(attribute.getComponent(index, component));
          geometry.setAttribute(
            name,
            new Float32BufferAttribute(values, attribute.itemSize),
          );
        }
      }
      if (object.material.name.startsWith("brick-")) metricBrickUv(geometry);
      if (object.material.name.startsWith('architectural-')) architecturalUv(geometry);
      const positions = geometry.getAttribute("position");
      if (
        (object.material.map || object.material.normalMap) &&
        !geometry.getAttribute("uv")
      ) {
        const uv: number[] = [];
        for (let i = 0; i < positions.count; i++)
          uv.push(positions.getX(i) / 4, positions.getY(i) / 4);
        geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
      }
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      const normals = geometry.getAttribute("normal");
      const coordinates = geometry.getAttribute("uv");
      for (let i = 0; i < positions.count; i++) {
        if (
          ![positions.getX(i), positions.getY(i), positions.getZ(i)].every(
            Number.isFinite,
          )
        )
          throw new Error(`Non-finite model geometry: ${building.id}`);
        if (
          coordinates &&
          ![coordinates.getX(i), coordinates.getY(i)].every(Number.isFinite)
        )
          throw new Error(
            `Non-finite model texture coordinates: ${building.id}`,
          );
        const normal = new Vector3(
          normals.getX(i),
          normals.getY(i),
          normals.getZ(i),
        );
        if (![normal.x, normal.y, normal.z].every(Number.isFinite))
          throw new Error(`Non-finite model normal: ${building.id}`);
        if (normal.lengthSq() < 1e-12) normal.set(0, 1, 0);
        else normal.normalize();
        normals.setXYZ(i, normal.x, normal.y, normal.z);
      }
      const key =
        object.material.uuid +
        "/" +
        Object.keys(geometry.attributes).sort().join(",");
      let batch = batches.get(key);
      if (!batch) {
        batch = { material: object.material, geometries: [] };
        batches.set(key, batch);
      }
      batch.geometries.push(geometry);
      object.geometry.dispose();
    }
  });
  group.clear();
  for (const batch of batches.values()) {
    const merged = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((g) => g.dispose());
    if (merged) group.add(new Mesh(merged, batch.material));
  }
  if (enablePhotoPatches)
    for (const patch of photoPatches.filter(
      (patch) => patch.buildingId === building.id,
    ))
      group.add(
        await createPhotoPatchMesh(
          patch,
          building.parts.find((part) => part.id === patch.partId)!.baseHeight,
        ),
      );
  const result = await new GLTFExporter().parseAsync(group, { binary: true });
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((m) => {
        if (
          m instanceof MeshStandardMaterial ||
          m instanceof MeshBasicMaterial
        ) {
          m.map?.dispose();
          if (m instanceof MeshStandardMaterial) m.normalMap?.dispose();
          if (m instanceof MeshStandardMaterial) m.roughnessMap?.dispose();
        }
        m.dispose();
      });
    }
  });
  if (!(result instanceof ArrayBuffer)) throw new Error("GLB export failed");
  materialCache.clear();
  roofTextures.clear();
  reflectionTexture = undefined;
  return URL.createObjectURL(new Blob([result], { type: "model/gltf-binary" }));
}
