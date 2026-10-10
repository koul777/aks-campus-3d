import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { BuildingPart } from "./data/geographic-buildings";
import { hakuRoofProfileTrial as profile } from "./data/haku-roof-profile";

/** Interpreted ring profile, not a measured reconstruction; used only for Haku. */
export function addHakuCurvedRoof(group: Group, part: BuildingPart, surface: MeshStandardMaterial) {
  const top = part.baseHeight + part.height;
  const center = new Vector3(
    part.footprint.reduce((sum, p) => sum + p[0], 0) / part.footprint.length,
    0,
    -part.footprint.reduce((sum, p) => sum + p[1], 0) / part.footprint.length,
  );
  const eaves = part.footprint.map(([x, n]) => {
    const point = new Vector3(x, 0, -n);
    return point.addScaledVector(point.clone().sub(center).normalize(), part.roof.eaves);
  });
  const knots = [{ radius: 0, height: 1, cornerLift: 0 }, ...profile.rings];
  const interpolate = (radius: number, field: "height" | "cornerLift") => {
    let k = 0;
    while (k < knots.length - 2 && radius > knots[k + 1].radius) k++;
    const a = knots[k], b = knots[k + 1], span = b.radius - a.radius;
    const slope = (index: number) => {
      const left = knots[Math.max(0, index - 1)], right = knots[Math.min(knots.length - 1, index + 1)];
      return (right[field] - left[field]) / (right.radius - left.radius);
    };
    const t = Math.max(0, Math.min(1, (radius - a.radius) / span));
    return (2 * t ** 3 - 3 * t ** 2 + 1) * a[field]
      + (t ** 3 - 2 * t ** 2 + t) * span * slope(k)
      + (-2 * t ** 3 + 3 * t ** 2) * b[field]
      + (t ** 3 - t ** 2) * span * slope(k + 1);
  };
  const pointAt = (side: number, radius: number, s: number) => {
    const edge = eaves[side].clone().lerp(eaves[(side + 1) % 4], (s + 1) / 2);
    const point = center.clone().lerp(edge, radius);
    point.y = top + part.roof.height * (interpolate(radius, "height") + interpolate(radius, "cornerLift") * s * s);
    return point;
  };
  const radii: number[] = [];
  for (let band = 0; band < knots.length - 1; band++)
    for (let step = 1; step <= 8; step++)
      radii.push(knots[band].radius + (knots[band + 1].radius - knots[band].radius) * step / 8);
  const segments = profile.subdivisionsPerSide;
  const ceramic = new MeshStandardMaterial({ color: part.roof.color, roughness: 0.78, metalness: 0.12 });
  ceramic.name = "haku-curved-ceramic-detail";
  const line = (a: Vector3, b: Vector3, radius: number) => {
    const direction = b.clone().sub(a);
    if (direction.lengthSq() < 1e-9) return;
    const mesh = new Mesh(new CylinderGeometry(radius, radius, direction.length(), 8), ceramic);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    group.add(mesh);
  };
  for (let side = 0; side < 4; side++) {
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    const edgeLength = eaves[side].distanceTo(eaves[(side + 1) % 4]);
    const faceDepth = center.distanceTo(eaves[side].clone().lerp(eaves[(side + 1) % 4], 0.5));
    positions.push(center.x, top + part.roof.height, center.z);
    uv.push(0, 0);
    for (const radius of radii)
      for (let j = 0; j <= segments; j++) {
        const s = 2 * j / segments - 1, point = pointAt(side, radius, s);
        positions.push(point.x, point.y, point.z);
        // One continuous face coordinate system; no reset at the ring boundaries.
        uv.push(s * radius * edgeLength / (2 * profile.tilePitchMetres), radius * faceDepth / 0.34);
      }
    const triangle = (a: number, b: number, c: number) => {
      const pa = new Vector3().fromArray(positions, a * 3), pb = new Vector3().fromArray(positions, b * 3), pc = new Vector3().fromArray(positions, c * 3);
      if (pb.sub(pa).cross(pc.sub(pa)).y < 0) indices.push(a, c, b);
      else indices.push(a, b, c);
    };
    for (let j = 0; j < segments; j++) triangle(0, 1 + j, 2 + j);
    for (let row = 1; row < radii.length; row++)
      for (let j = 0; j < segments; j++) {
        const a = 1 + (row - 1) * (segments + 1) + j, b = a + segments + 1;
        triangle(a, b, b + 1); triangle(a, b + 1, a + 1);
      }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const roof = new Mesh(geometry, surface);
    roof.userData.pavilionRoofSurface = true;
    group.add(roof);
    // Short connected hip segments follow the same smooth profile as the faces.
    let previous = pointAt(side, 0, -1).add(new Vector3(0, 0.025, 0));
    for (const radius of radii) {
      const next = pointAt(side, radius, -1).add(new Vector3(0, 0.025, 0));
      line(previous, next, profile.ridgeRadiusMetres); previous = next;
    }
    for (let end = 0; end < profile.tileEnds.perSide; end++) {
      const s = 2 * (end + 0.5) / profile.tileEnds.perSide - 1;
      const edge = pointAt(side, 1, s), inward = pointAt(side, 0.985, s);
      const outward = edge.clone().sub(inward).normalize();
      const cap = new Mesh(new CylinderGeometry(profile.tileEnds.radiusMetres, profile.tileEnds.radiusMetres, profile.tileEnds.depthMetres, profile.tileEnds.radialSegments), ceramic);
      cap.position.copy(edge).add(new Vector3(0, profile.tileEnds.surfaceOffsetMetres, 0));
      cap.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), outward);
      group.add(cap);
      // Restrained tile crowns remain subordinate to the continuous roof skin.
      let previousRib = pointAt(side, 0.1, s).add(new Vector3(0, 0.011, 0));
      for (const radius of radii.filter((r) => r > 0.1)) {
        const next = pointAt(side, radius, s).add(new Vector3(0, 0.011, 0));
        line(previousRib, next, 0.011); previousRib = next;
      }
    }
  }
}
