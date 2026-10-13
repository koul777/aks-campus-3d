import { campusOrigin, geographicBuildings } from "./geographic-buildings";

export type GeoPoint = [longitude: number, latitude: number];
export type OsmFeature = {
  id: string;
  tags: Record<string, string>;
  coordinates: GeoPoint[];
};
export type SurroundingsData = {
  source: string;
  attribution: string;
  license: string;
  snapshot: string;
  buildings: OsmFeature[];
  roads: OsmFeature[];
};
export type SurroundingBuilding = {
  id: string;
  name: string;
  footprint: GeoPoint[];
  center: GeoPoint;
  height: number;
  floors: number;
  heightSource: "osm-height" | "osm-levels" | "estimated";
  kind: "apartment" | "low-rise";
};
export const surroundingsSignature = (buildings: SurroundingBuilding[]) =>
  JSON.stringify(buildings.map((b) => [b.id, b.footprint, b.height, b.floors]));
export const METRES_LAT = 111_000;
export const METRES_LON =
  111_320 * Math.cos((campusOrigin.latitude * Math.PI) / 180);
export const toLocal = ([lon, lat]: GeoPoint): [number, number] => [
  (lon - campusOrigin.longitude) * METRES_LON,
  (lat - campusOrigin.latitude) * METRES_LAT,
];
export const toGeographic = ([east, north]: [number, number]): GeoPoint => [
  campusOrigin.longitude + east / METRES_LON,
  campusOrigin.latitude + north / METRES_LAT,
];

let request: Promise<SurroundingsData> | undefined;
export function loadSurroundings() {
  return (request ??= fetch("/data/surroundings.json")
    .then((response) => {
      if (!response.ok)
        throw new Error(`주변 지도 자료: HTTP ${response.status}`);
      return response.json() as Promise<SurroundingsData>;
    })
    .catch((error) => {
      request = undefined;
      throw error;
    }));
}

/** Keep OSM polygons unchanged, exclude the independently modelled campus footprints. */
export function getSurroundingBuildings(
  data: SurroundingsData,
): SurroundingBuilding[] {
  const campusIds = new Set(
    geographicBuildings.map((b) => b.footprintSourceId),
  );
  return data.buildings
    .filter((b) => !campusIds.has(b.id))
    .map((feature): SurroundingBuilding => {
      const footprint = feature.coordinates.slice(0, -1);
      const center = footprint.reduce<GeoPoint>(
        (p, q) => [
          p[0] + q[0] / footprint.length,
          p[1] + q[1] / footprint.length,
        ],
        [0, 0],
      );
      const measuredHeight = Number.parseFloat(feature.tags.height || "");
      const taggedFloors = Number.parseFloat(
        feature.tags["building:levels"] || "",
      );
      const apartment = feature.tags.building === "apartments";
      const local = footprint.map(toLocal);
      const area =
        Math.abs(
          local.reduce((sum, p, i) => {
            const q = local[(i + 1) % local.length];
            return sum + p[0] * q[1] - q[0] * p[1];
          }, 0),
        ) / 2;
      const smallOutbuilding =
        area < 40 ||
        ["garage", "garages", "shed"].includes(feature.tags.building);
      const floors =
        Number.isFinite(taggedFloors) && taggedFloors > 0
          ? Math.min(35, Math.round(taggedFloors))
          : apartment
            ? 5
            : smallOutbuilding
              ? 1
              : 2;
      return {
        id: feature.id,
        name: feature.tags.name || feature.tags["addr:street"] || "주변 건물",
        footprint,
        center,
        height:
          Number.isFinite(measuredHeight) && measuredHeight > 0
            ? Math.min(120, measuredHeight)
            : floors * 3.05 + 0.5,
        floors,
        heightSource:
          Number.isFinite(measuredHeight) && measuredHeight > 0
            ? "osm-height"
            : Number.isFinite(taggedFloors) && taggedFloors > 0
              ? "osm-levels"
              : "estimated",
        kind: apartment ? "apartment" : "low-rise",
      };
    })
    .filter((b) => b.footprint.length >= 3);
}
