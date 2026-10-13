import {
  toLocal,
  toGeographic,
  type GeoPoint,
  type SurroundingsData,
} from "./surroundings";
import { geographicBuildings } from "./geographic-buildings";
import { roundRoute, resampleRoute, type Point2 } from "../route-math";
import type { ActorKind } from "../moving-models";

export type RouteSpec = {
  id: string;
  name: string;
  kind: ActorKind;
  closed: boolean;
  points: Point2[];
  lane: number;
  speed: number;
  count: number;
  source: string;
};

export function createRouteSpecs(data: SurroundingsData): RouteSpec[] {
  const way = (id: string) => {
    const road = data.roads.find((r) => r.id === id);
    if (!road) throw new Error(`Missing OSM road ${id}`);
    return road.coordinates;
  };
  const route = (
    id: string,
    name: string,
    kind: ActorKind,
    coords: GeoPoint[],
    closed: boolean,
    lane: number,
    speed: number,
    count: number,
    source: string,
  ): RouteSpec => ({
    id,
    name,
    kind,
    closed,
    lane,
    speed,
    count,
    source,
    points: resampleRoute(
      roundRoute(
        coords.map(toLocal),
        closed,
        kind === "person"
          ? 1.5
          : kind === "bus" || id.startsWith("haogae-")
            ? 9
            : 4.5,
      ),
      kind === "person" ? 1.5 : 3,
    ),
  });
  const campusRoad = way("568041538").slice(0, 8);
  const publicRoad = [
    ...way("929474819"),
    ...way("1549235209").slice(1),
    ...way("929474821").slice(1),
    ...way("402980722").slice(1),
  ];
  // Keep the artificial respawn boundaries well outside the campus overview.
  // The coarse OSM chord clips the photo-modelled Boinjae corner. Insert an
  // imagery-interpreted bend within the road corridor, with vehicle-body clearance.
  const publicAdjusted = publicRoad.flatMap((point, index) => {
    const next = publicRoad[index + 1];
    return next && point[0] > 127.052 && next[0] < 127.0501
      ? ([
          point,
          [127.0514, 37.391716],
          [127.05088, 37.39199],
          [127.05055, 37.392155],
        ] as GeoPoint[])
      : [point];
  });
  const publicLocal = publicAdjusted.filter(
    ([lon, lat]) => lon > 127.0476 && lon < 127.0635 && lat < 37.396,
  );
  const reverse = [...publicLocal].reverse();
  // Paths below follow visible paved pedestrian margins/plazas in the local satellite reference.
  // They are visual walking routes, not an accessibility or surveyed navigation network.
  const relative = (id: string, points: Point2[]): GeoPoint[] => {
    const building = geographicBuildings.find((b) => b.id === id)!;
    const [e, n] = toLocal([
      building.anchor.longitude,
      building.anchor.latitude,
    ]);
    const angle = (building.rotationDegrees * Math.PI) / 180,
      c = Math.cos(angle),
      s = Math.sin(angle);
    return points.map(([x, y]) =>
      toGeographic([e + x * c - y * s, n + x * s + y * c]),
    );
  };
  // Stay below the full two-flight stair footprint, on the front path.
  const mainWalk = relative("main", [
    [-31, -36],
    [31, -36],
    [31, -39],
    [-31, -39],
  ]);
  const libraryWalk: GeoPoint[] = [
    [127.05157, 37.392486],
    [127.05198, 37.392597],
    [127.05243, 37.392684],
    [127.05256, 37.392354],
    [127.05215, 37.392256],
    [127.05181, 37.392189],
  ];
  const hallWalk = relative("hall", [
    [34, -20],
    [37, -20],
    [37, 20],
    [34, 20],
  ]);
  return [
    route(
      "main-promenade",
      "본관 앞 산책길",
      "person",
      mainWalk,
      true,
      0,
      1.15,
      8,
      "위성영상의 포장 공간 해석 · 가상 보행",
    ),
    route(
      "library-promenade",
      "도서관 앞 산책길",
      "person",
      libraryWalk,
      true,
      0,
      1.05,
      8,
      "위성영상·OSM 주변 길 해석 · 가상 보행",
    ),
    route(
      "hall-plaza",
      "강당 앞 광장",
      "person",
      hallWalk,
      true,
      0,
      1.1,
      6,
      "위성영상의 동쪽 광장 해석 · 가상 보행",
    ),
    route(
      "campus-north",
      "교내 동쪽 길 북행",
      "car",
      campusRoad,
      false,
      1.2,
      4.2,
      2,
      "OSM way 568041538",
    ),
    route(
      "campus-south",
      "교내 동쪽 길 남행",
      "car",
      [...campusRoad].reverse(),
      false,
      1.2,
      4.2,
      2,
      "OSM way 568041538",
    ),
    route(
      "haogae-east",
      "하오개로 동행",
      "car",
      reverse,
      false,
      1.7,
      8.6,
      6,
      "OSM 하오개로 중심선 · 차로 폭 추정",
    ),
    route(
      "haogae-west",
      "하오개로 서행",
      "car",
      publicLocal,
      false,
      1.7,
      8.6,
      6,
      "OSM 하오개로 중심선 · 차로 폭 추정",
    ),
    route(
      "express-east",
      "광역버스 동행",
      "bus",
      reverse,
      false,
      1.7,
      8.6,
      2,
      "OSM 하오개로 · 실제 노선과 무관한 가상 운행",
    ),
    route(
      "express-west",
      "광역버스 서행",
      "bus",
      publicLocal,
      false,
      1.7,
      8.6,
      2,
      "OSM 하오개로 · 실제 노선과 무관한 가상 운행",
    ),
  ];
}
