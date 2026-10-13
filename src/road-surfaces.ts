import {
  BoundingSphere,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  ComponentDatatype,
  Ellipsoid,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  PerInstanceColorAppearance,
  Primitive,
  PrimitiveType,
  ShadowMode,
  type Viewer,
} from "cesium";
import { toGeographic } from "./data/surroundings";
import type { RouteSpec } from "./data/campus-routes";
import {
  buildSampledRoute,
  sampleRoute,
  type SampledRoute,
} from "./route-math";
import { getVisualGroundElevation } from "./terrain";

/** Illustrative widths; centre lines are exactly the vehicle routes.
 * Lit terrain-following meshes retain vehicle shadows that flat ground
 * classification overlays would cover. Surface heights use the same DEM.
 */
export async function createRoadSurfaces(
  viewer: Viewer,
  specs: RouteSpec[],
  cancelled: () => boolean,
) {
  const primitives: Primitive[] = [];
  const details: { id: string; width: number; length: number }[] = [];
  const ribbon = async (
    route: SampledRoute,
    width: number,
    color: string,
    offset = 0,
    start = 0,
    end = route.length,
    lift = 0.025,
  ) => {
    const steps = Math.ceil((end - start) / 2),
      columns = width > 2 ? 4 : 1;
    const positions = new Float64Array((steps + 1) * (columns + 1) * 3);
    const normals = new Float32Array(positions.length);
    await Promise.all(
      Array.from({ length: steps + 1 }, async (_, row) => {
        const distance = start + ((end - start) * row) / steps;
        await Promise.all(
          Array.from({ length: columns + 1 }, async (_, column) => {
            const point = sampleRoute(
              route,
              distance,
              offset + width * (column / columns - 0.5),
            );
            const [lon, lat] = toGeographic([point.east, point.north]);
            const height = await getVisualGroundElevation(lon, lat);
            const position = Cartesian3.fromDegrees(lon, lat, height + lift);
            const normal = Ellipsoid.WGS84.geodeticSurfaceNormal(position);
            const index = (row * (columns + 1) + column) * 3;
            positions.set([position.x, position.y, position.z], index);
            normals.set([normal.x, normal.y, normal.z], index);
          }),
        );
      }),
    );
    const indices: number[] = [];
    for (let row = 0; row < steps; row++)
      for (let column = 0; column < columns; column++) {
        const a = row * (columns + 1) + column,
          b = a + 1,
          c = a + columns + 1,
          d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    return new GeometryInstance({
      geometry: new Geometry({
        attributes: Object.assign(new GeometryAttributes(), {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: positions,
          }),
          normal: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: normals,
          }),
        }),
        indices: new Uint32Array(indices),
        primitiveType: PrimitiveType.TRIANGLES,
        boundingSphere: BoundingSphere.fromVertices(positions),
      }),
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(
          Color.fromCssColorString(color),
        ),
      },
    });
  };
  if (new URLSearchParams(location.search).get("roads") !== "imagery") {
    const shoulders: Promise<GeometryInstance>[] = [],
      asphalt: Promise<GeometryInstance>[] = [],
      markings: Promise<GeometryInstance>[] = [];
    for (const id of ["haogae-west", "campus-north"]) {
      const spec = specs.find((s) => s.id === id)!;
      const route = buildSampledRoute(
        spec.id,
        spec.points,
        spec.points.map(() => 0),
        false,
      );
      const publicRoad = id === "haogae-west",
        width = publicRoad ? 7.4 : 5.0;
      details.push({ id, width, length: route.length });
      shoulders.push(
        ribbon(route, width + 0.45, "#a3a096", 0, 0, route.length, 0.078),
      );
      asphalt.push(ribbon(route, width, "#606763", 0, 0, route.length, 0.09));
      for (const side of [-1, 1])
        markings.push(
          ribbon(
            route,
            0.11,
            "#dddbca",
            side * (width / 2 - 0.28),
            1,
            route.length - 1,
            0.105,
          ),
        );
      if (publicRoad) {
        for (const offset of [-0.12, 0.12])
          markings.push(
            ribbon(route, 0.1, "#dfbd5e", offset, 0, route.length, 0.105),
          );
      } else {
        for (let distance = 8; distance < route.length - 8; distance += 12)
          markings.push(
            ribbon(
              route,
              0.1,
              "#dad8ca",
              0,
              distance,
              Math.min(distance + 4, route.length - 4),
              0.105,
            ),
          );
      }
    }
    const layers = await Promise.all([
      Promise.all(shoulders),
      Promise.all(asphalt),
      Promise.all(markings),
    ]);
    if (cancelled()) throw new DOMException("Scene was closed", "AbortError");
    for (const geometryInstances of layers) {
      const primitive = new Primitive({
        geometryInstances,
        appearance: new PerInstanceColorAppearance({
          flat: false,
          translucent: false,
          closed: false,
        }),
        shadows: ShadowMode.ENABLED,
        allowPicking: false,
        asynchronous: false,
      });
      viewer.scene.primitives.add(primitive);
      primitives.push(primitive);
    }
  }
  return {
    details,
    isReady: () => primitives.every((p) => p.ready),
    dispose: () => {
      if (!viewer.isDestroyed())
        for (const primitive of primitives)
          viewer.scene.primitives.remove(primitive);
    },
  };
}
