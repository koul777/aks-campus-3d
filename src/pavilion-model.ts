import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Raycaster,
  Shape,
  Vector2,
  Vector3,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  BufferAttribute,
} from "three";
import type {
  BuildingPart,
  GeographicBuilding,
} from "./data/geographic-buildings";
import { compactHakuRafterSamples, hakuRafterCompactBounds } from "./haku-rafter-compact";
import {
  pavilionDetails,
  hakuWoodMaterialTrial,
} from "./data/pavilion-details";

/** Source-supported simplified timber details; roof envelope and floor datum are unchanged. */
export function addPavilionDetails(
  group: Group,
  building: GeographicBuilding,
  part: BuildingPart,
  hakuGeometry?: "compact",
) {
  const contract = pavilionDetails;
  if (building.id !== contract.buildingId || !contract.enabledByDefault) return;
  const wood = new MeshStandardMaterial({
      color: contract.wood.mid,
      roughness: contract.wood.roughness,
      metalness: 0,
    }),
    light = new MeshStandardMaterial({
      color: contract.wood.light,
      roughness: contract.wood.roughness,
      metalness: 0,
    });
  wood.name = light.name = "haku-exposed-wood";
  const top = part.baseHeight + part.height,
    deckTop = part.baseHeight + 0.35;
  const center = new Vector3(
    part.footprint.reduce((sum, p) => sum + p[0], 0) / part.footprint.length,
    0,
    -part.footprint.reduce((sum, p) => sum + p[1], 0) / part.footprint.length,
  );
  const points = part.footprint.map(([e, n]) => new Vector3(e, 0, -n));
  const eaves = points.map((point) =>
    point
      .clone()
      .addScaledVector(point.clone().sub(center).normalize(), part.roof.eaves),
  );
  const block = (
    start: Vector3,
    end: Vector3,
    height: number,
    width: number,
    material = wood,
  ) => {
    const direction = end.clone().sub(start),
      mesh = new Mesh(
        new BoxGeometry(direction.length(), height, width),
        material,
      );
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new Vector3(1, 0, 0),
      direction.normalize(),
    );
    group.add(mesh);
  };
  const cylinder = (start: Vector3, end: Vector3) => {
    const direction = end.clone().sub(start),
      mesh = new Mesh(
        new CylinderGeometry(
          contract.rafters.radius,
          contract.rafters.radius,
          direction.length(),
          contract.rafters.radialSegments,
        ),
        light,
      );
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.normalize(),
    );
    group.add(mesh);
  };
  // Sample the actual main/rim triangles, never an estimated straight roof chord.
  group.updateMatrixWorld(true);
  const roofSurfaces = group.children.filter(
    (child): child is Mesh =>
      child instanceof Mesh && child.userData.pavilionRoofSurface === true,
  );
  const ray = new Raycaster();
  const compactStats = {
    mode: "compact",
    ...hakuRafterCompactBounds,
    paths: 0,
    sourceSegments: 0,
    compactSegments: 0,
    maximumDownwardDeviationMetres: 0,
    maximumUpwardDeviationMetres: 0,
  };
  const roofHeight = (point: Vector3) => {
    ray.set(
      new Vector3(point.x, top + part.roof.height + 5, point.z),
      new Vector3(0, -1, 0),
    );
    return ray.intersectObjects(roofSurfaces, false)[0]?.point.y;
  };
  const underRoof = (start: Vector3, end: Vector3) => {
    const path = end.clone().sub(start),
      length = path.length();
    if (length < 0.01) return;
    const values = [0, 1];
    for (let i = 1; i < 8; i++) values.push(i / 8);
    // Include every main/rim triangle edge intersection, covering the body-eave break.
    for (const surface of roofSurfaces) {
      const pos = surface.geometry.getAttribute("position"),
        index = surface.geometry.index;
      const count = index?.count ?? pos.count;
      for (let i = 0; i < count; i += 3)
        for (let edge = 0; edge < 3; edge++) {
          const ia = index ? index.getX(i + edge) : i + edge,
            ib = index
              ? index.getX(i + ((edge + 1) % 3))
              : i + ((edge + 1) % 3);
          const ax = pos.getX(ia),
            az = pos.getZ(ia),
            bx = pos.getX(ib),
            bz = pos.getZ(ib);
          const ex = bx - ax,
            ez = bz - az,
            determinant = path.x * ez - path.z * ex;
          if (Math.abs(determinant) < 1e-9) continue;
          const t = ((ax - start.x) * ez - (az - start.z) * ex) / determinant;
          const u =
            ((ax - start.x) * path.z - (az - start.z) * path.x) / determinant;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) values.push(t);
        }
    }
    const sorted = [
      ...new Set(values.map((t) => Math.round(t * 1e8) / 1e8)),
    ].sort((a, b) => a - b);
    const samples = sorted.map((t) => {
      const point = start.clone().lerp(end, t);
      const heights: number[] = [];
      for (const [dx, dz] of [
        [0, 0],
        [0.07, 0],
        [-0.07, 0],
        [0, 0.07],
        [0, -0.07],
        [0.05, 0.05],
        [0.05, -0.05],
        [-0.05, 0.05],
        [-0.05, -0.05],
      ]) {
        const height = roofHeight(point.clone().add(new Vector3(dx, 0, dz)));
        if (height !== undefined) heights.push(height);
      }
      if (!heights.length) return undefined;
      point.y =
        Math.min(...heights) -
        contract.rafters.roofClearance -
        contract.rafters.radius -
        0.015;
      return point;
    });
    let emittedSamples = samples;
    if (hakuGeometry === "compact") {
      const compact = compactHakuRafterSamples(samples);
      emittedSamples = compact.samples;
      compactStats.paths++;
      compactStats.sourceSegments += compact.sourceSegments;
      compactStats.compactSegments += compact.compactSegments;
      compactStats.maximumDownwardDeviationMetres = Math.max(compactStats.maximumDownwardDeviationMetres, compact.maximumDownwardDeviationMetres);
      compactStats.maximumUpwardDeviationMetres = Math.max(compactStats.maximumUpwardDeviationMetres, compact.maximumUpwardDeviationMetres);
    }
    for (let i = 1; i < emittedSamples.length; i++) {
      const a = emittedSamples[i - 1],
        b = emittedSamples[i];
      if (a && b && a.distanceTo(b) > 0.001) cylinder(a, b);
    }
  };
  const backing = eaves.map((point) =>
    point
      .clone()
      .addScaledVector(
        center.clone().sub(point).normalize(),
        contract.soffit.recessFromEave,
      ),
  );
  const geometry = new ExtrudeGeometry(
    new Shape(backing.map((point) => new Vector2(point.x, -point.z))),
    { depth: contract.soffit.backingThickness, bevelEnabled: false },
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, top - 0.16 - contract.soffit.backingThickness, 0);
  group.add(new Mesh(geometry, wood));
  const bridgeStart = building.site?.steppedApproach?.start ?? building.site?.bridge?.start;
  let accessEdge = -1,
    accessAlong = 0;
  if (bridgeStart) {
    const point = new Vector3(bridgeStart[0], 0, -bridgeStart[1]);
    let distance = Infinity;
    points.forEach((a, index) => {
      const b = points[(index + 1) % points.length],
        edge = b.clone().sub(a),
        fraction = Math.max(
          0,
          Math.min(1, point.clone().sub(a).dot(edge) / edge.lengthSq()),
        );
      const candidate = a
        .clone()
        .addScaledVector(edge, fraction)
        .distanceTo(point);
      if (candidate < distance) {
        distance = candidate;
        accessEdge = index;
        accessAlong = fraction * edge.length();
      }
    });
  }
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length],
      edge = b.clone().sub(a),
      length = edge.length(),
      axis = edge.clone().normalize();
    for (const descriptor of [contract.headBeams, contract.capBeams])
      block(
        a
          .clone()
          .setY(top + descriptor.topOffsetFromEave - descriptor.depth / 2),
        b
          .clone()
          .setY(top + descriptor.topOffsetFromEave - descriptor.depth / 2),
        descriptor.depth,
        descriptor.width,
      );
    const ea = eaves[index],
      eb = eaves[(index + 1) % points.length];
    for (let rafter = 0; rafter < contract.rafters.perSide; rafter++) {
      const t = (rafter + 0.5) / contract.rafters.perSide,
        outer = ea.clone().lerp(eb, t),
        inside = a.clone().lerp(b, t);
      const inward = center.clone().sub(inside).normalize();
      inside.addScaledVector(inward, 0.55);
      outer.addScaledVector(
        center.clone().sub(outer).normalize(),
        contract.rafters.radius + 0.025,
      );
      underRoof(outer, inside);
    }
    for (const y of [part.baseHeight + 0.6, part.baseHeight + 1.2]) {
      const gapStart = accessAlong - contract.railing.gap.width / 2,
        gapEnd = accessAlong + contract.railing.gap.width / 2;
      const ranges =
        index === accessEdge
          ? [
              [0, Math.max(0, gapStart)],
              [Math.min(length, gapEnd), length],
            ]
          : [[0, length]];
      for (const [start, end] of ranges)
        if (end > start)
          block(
            a.clone().addScaledVector(axis, start).setY(y),
            a.clone().addScaledVector(axis, end).setY(y),
            0.08,
            0.08,
            light,
          );
    }
    if (index === accessEdge) {
      for (const distance of [
        accessAlong - contract.railing.gap.width / 2,
        accessAlong + contract.railing.gap.width / 2,
      ]) {
        const foot = a.clone().addScaledVector(axis, distance).setY(deckTop);
        block(
          foot,
          foot.clone().setY(part.baseHeight + 1.28),
          contract.railing.gap.endPostWidth,
          contract.railing.gap.endPostWidth,
          light,
        );
      }
    }
    const count = Math.max(
      1,
      Math.floor(length / contract.railing.moduleWidth),
    );
    for (let module = 0; module < count; module++) {
      const start = (length * module) / count,
        end = (length * (module + 1)) / count,
        middle = (start + end) / 2;
      if (
        index === accessEdge &&
        Math.abs(middle - accessAlong) < contract.railing.gap.width / 2 + 0.1
      )
        continue;
      const width = end - start,
        h = contract.railing.panelHeight,
        base = part.baseHeight + 0.64;
      const pattern = [
        [0, 0, 0, h],
        [0, h, width, h],
        [width, h, width, h * 0.35],
        [width, h * 0.35, width * 0.35, h * 0.35],
        [width * 0.35, h * 0.35, width * 0.35, h * 0.75],
        [width * 0.35, h * 0.75, width * 0.7, h * 0.75],
      ];
      for (const [x1, y1, x2, y2] of pattern)
        block(
          a
            .clone()
            .addScaledVector(axis, start + x1)
            .setY(base + y1),
          a
            .clone()
            .addScaledVector(axis, start + x2)
            .setY(base + y2),
          contract.railing.barWidth,
          contract.railing.barWidth,
          light,
        );
    }
    block(
      a.clone().setY(deckTop - 0.16),
      b.clone().setY(deckTop - 0.16),
      0.3,
      contract.deck.edgeFasciaThickness,
      wood,
    );
  });
  for (const corner of points) {
    const outward = corner.clone().sub(center).normalize();
    for (let fan = 0; fan < contract.rafters.cornerFanCount; fan++) {
      const direction = outward
        .clone()
        .applyAxisAngle(
          new Vector3(0, 1, 0),
          (fan - (contract.rafters.cornerFanCount - 1) / 2) * 0.25,
        );
      underRoof(
        corner
          .clone()
          .addScaledVector(
            direction,
            part.roof.eaves - contract.rafters.radius - 0.1,
          )
          .setY(top - 0.12),
        corner
          .clone()
          .addScaledVector(direction, -0.5)
          .setY(top + 0.12),
      );
    }
    for (let bracket = 0; bracket < contract.brackets.perCorner; bracket++) {
      const direction = outward
        .clone()
        .applyAxisAngle(new Vector3(0, 1, 0), ((bracket - 0.5) * Math.PI) / 2);
      block(
        corner.clone().setY(top - 0.5),
        corner
          .clone()
          .addScaledVector(direction, contract.brackets.reach)
          .setY(top - 0.3),
        contract.brackets.depth,
        contract.brackets.width,
        light,
      );
    }
  }
  group.userData.pavilionDetails = {
    sources: contract.sources,
    status: "source-observed-details-dimensions-estimated",
    preserved: contract.preserve,
  };
  if (hakuGeometry === "compact") group.userData.pavilionGeometryCompact = compactStats;
}

/** Stock CC0 timber trial; physical repeat is estimated, never an institute scan. */
export async function applyHakuWoodTrial(group: Group, normalOnly = false, tintedDiffuseOnly = false) {
  const trial = hakuWoodMaterialTrial;
  const loader = new TextureLoader();
  const [diffuse, normal] = await Promise.all([
    normalOnly && !tintedDiffuseOnly ? Promise.resolve(undefined) : loader.loadAsync(trial.diffuse),
    tintedDiffuseOnly ? Promise.resolve(undefined) : loader.loadAsync(trial.normalGL),
  ]);
  if (diffuse) {
    diffuse.colorSpace = SRGBColorSpace;
    diffuse.wrapS = diffuse.wrapT = RepeatWrapping;
    diffuse.userData.mimeType = "image/jpeg";
  }
  if (normal) {
    normal.wrapS = normal.wrapT = RepeatWrapping;
    normal.userData.mimeType = "image/jpeg";
  }
  const surface = new MeshStandardMaterial({
    color: "white",
    map: diffuse ?? null,
    normalMap: normal ?? null,
    normalScale: new Vector2(normalOnly ? 0.06 : trial.normalScale, normalOnly ? 0.06 : trial.normalScale),
    roughness: trial.roughness,
    metalness: 0,
  });
  surface.name = tintedDiffuseOnly ? "haku-warm-Wood096-diffuse-tinted-opt-in" : normalOnly ? "haku-warm-Wood096-normal-opt-in" : "haku-stock-Wood096-opt-in";
  surface.userData = {
    source: trial.source,
    license: trial.license,
    actualCampusScan: false,
    repeatMetresEstimated: 1,
  };
  const warmSurfaces = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  group.traverse((object) => {
    if (
      !(object instanceof Mesh) ||
      Array.isArray(object.material) ||
      object.material.name !== "haku-exposed-wood"
    )
      return;
    const geometry = object.geometry,
      position = geometry.getAttribute("position"),
      previous = geometry.getAttribute("uv");
    const values: number[] = [];
    const parameters = geometry.parameters as
      | {
          width?: number;
          height?: number;
          depth?: number;
          radiusTop?: number;
          radiusBottom?: number;
        }
      | undefined;
    for (let i = 0; i < position.count; i++) {
      if (geometry.type === "CylinderGeometry" && previous) {
        // Cylinder V follows its local Y axis before rotation; U wraps circumference.
        values.push(
          previous.getX(i) * 2 * Math.PI * (parameters?.radiusTop ?? 0.16),
          previous.getY(i) * (parameters?.height ?? 1),
        );
      } else if (geometry.type === "BoxGeometry" && previous) {
        const w = parameters?.width ?? 1,
          h = parameters?.height ?? 1,
          d = parameters?.depth ?? 1;
        const longest = Math.max(w, h, d);
        if (longest === h)
          values.push(previous.getX(i) * Math.max(w, d), previous.getY(i) * h);
        else
          values.push(
            previous.getY(i) * Math.max(h, d),
            previous.getX(i) * longest,
          );
      } else {
        values.push(position.getX(i), position.getZ(i));
      }
    }
    geometry.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array(values), 2),
    );
    const original = object.material as MeshStandardMaterial;
    if (normalOnly || tintedDiffuseOnly) {
      let warm = warmSurfaces.get(original);
      if (!warm) {
        warm = original.clone();
        warm.name = surface.name;
        // Standard PBR diffuse tint: preserve the original warm colour and scalar
        // material response. Source pixels stay unchanged; tinted mode has no normal.
        warm.normalMap = normal ?? null;
        if (tintedDiffuseOnly) warm.map = diffuse ?? null;
        else warm.normalScale.set(0.06, 0.06);
        warm.userData = {
          ...surface.userData,
          baselineWarmColorPreserved: true,
          diffuseTextureApplied: tintedDiffuseOnly,
          normalTextureApplied: !tintedDiffuseOnly,
          ...(tintedDiffuseOnly ? { diffuseTint: "original-material-color", sourcePixelsUnmodified: true } : {}),
        };
        warmSurfaces.set(original, warm);
      }
      object.material = warm;
    } else {
      original.dispose();
      object.material = surface;
    }
  });
  if (normalOnly || tintedDiffuseOnly) {
    warmSurfaces.forEach((_warm, original) => original.dispose());
    surface.dispose();
  }
}
