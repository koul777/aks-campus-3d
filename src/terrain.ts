import {
  Credit,
  CustomHeightmapTerrainProvider,
  WebMercatorTilingScheme,
} from "cesium";
import type { GeographicBuilding } from "./data/geographic-buildings";
import type { BuildingGroundProfile } from "./building-ground-profile";
import {
  geographicAtTilePoint,
  gradeShorelineHeight,
  gradeRetainingHeight,
  localToGeographic,
  shorelinePatches,
  retainingPatches,
  tileIntersectsRetaining,
  tileIntersectsShoreline,
  tileCoordinates,
  waterSurfaceFor,
  photoSitePatches,
  gradePhotoSiteHeight,
  tileIntersectsPhotoSite,
} from "./terrain-grading";

const tileCache = new Map<string, Promise<Float32Array>>();
const MAX_LEVEL = 14;
const GRADED_MAX_LEVEL = 18;
const RETAINING_MAX_LEVEL = 19;
const PHOTO_SITE_MAX_LEVEL = 19;
export const TERRAIN_CREDIT =
  "Elevation: AWS Terrain Tiles / Mapzen (30 m DEM)";

let waterLevels: Promise<Map<string, number>> | undefined;
let retainingLevels: Promise<Map<string, number>> | undefined;
let photoSiteLevels: Promise<Map<string, number>> | undefined;
function preparePhotoSiteLevels() {
  if(!photoSiteLevels){
    const request=Promise.all(photoSitePatches.map(async({building})=>
      [building.id,(await getFacilityElevation(building))+getFacilityGroundClearance(building)] as const,
    )).then(entries=>new Map(entries));
    photoSiteLevels=request;
    request.catch(()=>{if(photoSiteLevels===request)photoSiteLevels=undefined;});
  }
  return photoSiteLevels;
}
function prepareRetainingLevels() {
  if (!retainingLevels) {
    const request = Promise.all(
      retainingPatches.map(
        async ({ building }) =>
          [building.id, await getFacilityElevation(building)] as const,
      ),
    ).then((entries) => new Map(entries));
    retainingLevels = request;
    request.catch(() => {
      if (retainingLevels === request) retainingLevels = undefined;
    });
  }
  return retainingLevels;
}
function prepareWaterLevels() {
  if (!waterLevels) {
    const request = Promise.all(
      shorelinePatches.map(
        async ({ building, water }) =>
          [
            building.id,
            (await getFacilityElevation(building)) +
              getFacilityGroundClearance(building) +
              water.elevation,
          ] as const,
      ),
    ).then((entries) => new Map(entries));
    waterLevels = request;
    request.catch(() => {
      if (waterLevels === request) waterLevels = undefined;
    });
  }
  return waterLevels;
}

/** Interpolate the existing 65x65 native DEM grid; no new surveyed detail is invented. */
function nativeGridHeight(source: Float32Array, column: number, row: number) {
  const x0 = Math.min(64, Math.floor(column)),
    y0 = Math.min(64, Math.floor(row));
  const x1 = Math.min(64, x0 + 1),
    y1 = Math.min(64, y0 + 1);
  const tx = column - x0,
    ty = row - y0;
  const at = (x: number, y: number) =>
    source[Math.round((y * 255) / 64) * 256 + Math.round((x * 255) / 64)];
  return (
    (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) +
    (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty
  );
}

function heightTile(
  x: number,
  y: number,
  level: number,
): Promise<Float32Array> {
  const key = `${level}/${x}/${y}`;
  let request = tileCache.get(key);
  if (!request) {
    request = new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 256;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) throw new Error("Elevation decoding unavailable");
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, 256, 256).data;
          const heights = new Float32Array(256 * 256);
          for (let i = 0; i < heights.length; i++) {
            heights[i] =
              pixels[i * 4] * 256 +
              pixels[i * 4 + 1] +
              pixels[i * 4 + 2] / 256 -
              32768;
          }
          resolve(heights);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () =>
        reject(new Error("실제 지형 자료를 불러오지 못했습니다."));
      image.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`;
    });
    tileCache.set(key, request);
    request.catch(() => tileCache.delete(key));
  }
  return request;
}

export function createTerrain() {
  const provider = new CustomHeightmapTerrainProvider({
    width: 65,
    height: 65,
    tilingScheme: new WebMercatorTilingScheme(),
    credit: new Credit(TERRAIN_CREDIT),
    callback: (x, y, level) => {
      const intersects = tileIntersectsShoreline(x, y, level);
      const retaining = tileIntersectsRetaining(x, y, level);
      const photoSite = tileIntersectsPhotoSite(x,y,level);
      if (
        level > MAX_LEVEL &&
        !(
          (intersects && level <= GRADED_MAX_LEVEL) ||
          (retaining && level <= RETAINING_MAX_LEVEL) ||
          (photoSite && level <= PHOTO_SITE_MAX_LEVEL)
        )
      )
        return undefined;
      const sourceLevel = Math.min(level, MAX_LEVEL);
      const scale = 2 ** (level - sourceLevel);
      const parentX = Math.floor(x / scale),
        parentY = Math.floor(y / scale);
      // Coarse grids retain the original DEM. Grading coarse nodes would spread
      // the small site changes across tens of metres through upsampling.
      const grade = level >= GRADED_MAX_LEVEL;
      const gradeSite = level >= GRADED_MAX_LEVEL-1;
      return Promise.all([
        heightTile(parentX, parentY, sourceLevel),
        grade && intersects
          ? prepareWaterLevels()
          : Promise.resolve(new Map<string, number>()),
        grade && retaining
          ? prepareRetainingLevels()
          : Promise.resolve(new Map<string, number>()),
        gradeSite && photoSite ? preparePhotoSiteLevels() : Promise.resolve(new Map<string, number>()),
      ]).then(([source, levels, groundLevels, siteLevels]) => {
        const sampled = new Float32Array(65 * 65);
        for (let row = 0; row < 65; row++)
          for (let column = 0; column < 65; column++) {
            const nativeColumn =
              ((x - parentX * scale + column / 64) / scale) * 64;
            const nativeRow = ((y - parentY * scale + row / 64) / scale) * 64;
            let height = nativeGridHeight(source, nativeColumn, nativeRow);
            if (grade && (intersects || retaining)) {
              const coordinate = geographicAtTilePoint(
                x + column / 64,
                y + row / 64,
                level,
              );
              height = gradeShorelineHeight(
                coordinate.longitude,
                coordinate.latitude,
                height,
                levels,
              );
              height = gradeRetainingHeight(
                coordinate.longitude,
                coordinate.latitude,
                height,
                groundLevels,
              );
            }
            if(gradeSite&&photoSite){
              const coordinate=geographicAtTilePoint(x+column/64,y+row/64,level);
              height=gradePhotoSiteHeight(coordinate.longitude,coordinate.latitude,height,siteLevels,level);
            }
            sampled[row * 65 + column] = height;
          }
        return sampled;
      });
    },
  });
  // A missing callback result means "retry later". Explicit availability lets
  // Cesium upsample the final real DEM tile while refining satellite imagery.
  provider.getTileDataAvailable = (x, y, level) =>
    level <= MAX_LEVEL ||
    (level <= GRADED_MAX_LEVEL && tileIntersectsShoreline(x, y, level)) ||
    (level <= RETAINING_MAX_LEVEL && tileIntersectsRetaining(x, y, level)) ||
    (level <= PHOTO_SITE_MAX_LEVEL && tileIntersectsPhotoSite(x,y,level));
  return provider;
}

export async function elevationAt(longitude: number, latitude: number) {
  const { x, y } = tileCoordinates(longitude, latitude, MAX_LEVEL);
  const heights = await heightTile(Math.floor(x), Math.floor(y), MAX_LEVEL);
  const column = Math.min(255, Math.floor((x % 1) * 256));
  const row = Math.min(255, Math.floor((y % 1) * 256));
  return heights[row * 256 + column];
}

async function nativeElevationAt(longitude: number, latitude: number) {
  const { x, y } = tileCoordinates(longitude, latitude, MAX_LEVEL);
  const source = await heightTile(Math.floor(x), Math.floor(y), MAX_LEVEL);
  return nativeGridHeight(source, (x % 1) * 64, (y % 1) * 64);
}

/** Same native DEM and estimated site grading used by rendered ground-fit geometry. */
export async function getVisualGroundElevation(
  longitude: number,
  latitude: number,
) {
  const [original, waters, retaining, photoSite] = await Promise.all([
    nativeElevationAt(longitude, latitude),
    prepareWaterLevels(),
    prepareRetainingLevels(),
    preparePhotoSiteLevels(),
  ]);
  return gradePhotoSiteHeight(longitude,latitude,gradeRetainingHeight(
    longitude,
    latitude,
    gradeShorelineHeight(longitude, latitude, original, waters),
    retaining,
  ),photoSite);
}

export function getFacilityGroundClearance(building: GeographicBuilding) {
  return waterSurfaceFor(building) || building.kind === "underground-parking"
    ? 0
    : 1;
}

export async function getFacilityElevation(building: GeographicBuilding) {
  const coordinate = building.groundSampleOffset
    ? localToGeographic(building, building.groundSampleOffset)
    : building.anchor;
  const water = waterSurfaceFor(building);
  if (water) {
    // The coarse DEM cannot measure the water level. Use its low shoreline
    // sample as an explicit visual estimate, avoiding an artificial raised pool.
    const samples = [
      coordinate,
      ...water.outline.map((point) => localToGeographic(building, point)),
    ];
    return Math.min(
      ...(await Promise.all(
        samples.map((p) => nativeElevationAt(p.longitude, p.latitude)),
      )),
    );
  }
  return building.groundSampleOffset
    ? nativeElevationAt(coordinate.longitude, coordinate.latitude)
    : elevationAt(coordinate.longitude, coordinate.latitude);
}

/** Ground-fit geometry uses the same source DEM and bounded site estimates as terrain. */
export async function sampleBuildingGround(
  building: GeographicBuilding,
): Promise<BuildingGroundProfile> {
  const datum =
    (await getFacilityElevation(building)) +
    getFacilityGroundClearance(building);
  const sample = async (point: [number, number]) => {
    const p = localToGeographic(building, point);
    return (await getVisualGroundElevation(p.longitude, p.latitude)) - datum;
  };
  const parts = await Promise.all(
    building.parts.map(async (part) => {
      const edgeHeights = await Promise.all(
        part.footprint.map((point) => sample(point)),
      );
      let entryGroundHeight: number | undefined;
      if (part.entrance) {
        const minE = Math.min(...part.footprint.map((p) => p[0])),
          maxE = Math.max(...part.footprint.map((p) => p[0]));
        const minN = Math.min(...part.footprint.map((p) => p[1])),
          maxN = Math.max(...part.footprint.map((p) => p[1]));
        const side = part.facadeSide ?? part.columnSide ?? "south";
        const reach = part.entrance.depth + 1;
        const centre: [number, number] =
          side === "south"
            ? [(minE + maxE) / 2, minN - reach]
            : side === "north"
              ? [(minE + maxE) / 2, maxN + reach]
              : side === "east"
                ? [maxE + reach, (minN + maxN) / 2]
                : [minE - reach, (minN + maxN) / 2];
        entryGroundHeight = await sample(centre);
      }
      return [part.id, { edgeHeights, entryGroundHeight }] as const;
    }),
  );
  return {
    parts: Object.fromEntries(parts),
    bridgeLandingHeight: building.site?.bridge
      ? await sample(building.site.bridge.end)
      : undefined,
    accessStairGroundHeight: building.site?.access
      ? await sample(building.site.access.stairs.end)
      : undefined,
  };
}
