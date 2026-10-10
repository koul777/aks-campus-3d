import {
  geographicBuildings,
  type GeographicBuilding,
  type LocalPoint,
} from "./data/geographic-buildings";
import { photoSiteGrades } from "./data/site-grading";

const EARTH_RADIUS = 6378137;
const RAD = Math.PI / 180;
export const BANK_BLEND_WIDTH = 6;

export function waterSurfaceFor(building: GeographicBuilding) {
  if (building.site?.water) return building.site.water;
  if (building.kind === "pond") {
    const part = building.parts[0];
    return {
      outline: part.footprint,
      elevation: part.baseHeight + 0.12,
      color: part.wallColor,
    };
  }
}

/** Local shoreline grading is a visualization estimate, not a finer surveyed DEM. */
export function localToGeographic(
  building: GeographicBuilding,
  point: LocalPoint,
) {
  const angle = building.rotationDegrees * RAD;
  const east = point[0] * Math.cos(angle) - point[1] * Math.sin(angle);
  const north = point[0] * Math.sin(angle) + point[1] * Math.cos(angle);
  return {
    longitude:
      building.anchor.longitude +
      east / (EARTH_RADIUS * Math.cos(building.anchor.latitude * RAD)) / RAD,
    latitude: building.anchor.latitude + north / EARTH_RADIUS / RAD,
  };
}

export function geographicToLocal(
  building: GeographicBuilding,
  longitude: number,
  latitude: number,
): LocalPoint {
  const east =
    (longitude - building.anchor.longitude) *
    RAD *
    EARTH_RADIUS *
    Math.cos(building.anchor.latitude * RAD);
  const north = (latitude - building.anchor.latitude) * RAD * EARTH_RADIUS;
  const angle = building.rotationDegrees * RAD;
  return [
    east * Math.cos(angle) + north * Math.sin(angle),
    -east * Math.sin(angle) + north * Math.cos(angle),
  ];
}

export const shorelinePatches = geographicBuildings
  .filter((building) => waterSurfaceFor(building))
  .map((building) => {
    const water = waterSurfaceFor(building)!;
    const outline = water.outline;
    const vertices = outline.map((point) => localToGeographic(building, point));
    const latitudeMargin = BANK_BLEND_WIDTH / EARTH_RADIUS / RAD;
    const longitudeMargin =
      latitudeMargin / Math.cos(building.anchor.latitude * RAD);
    return {
      building,
      water,
      outline,
      bounds: {
        west: Math.min(...vertices.map((p) => p.longitude)) - longitudeMargin,
        east: Math.max(...vertices.map((p) => p.longitude)) + longitudeMargin,
        south: Math.min(...vertices.map((p) => p.latitude)) - latitudeMargin,
        north: Math.max(...vertices.map((p) => p.latitude)) + latitudeMargin,
      },
    };
  });

export const retainingPatches = geographicBuildings.flatMap((building) =>
  building.parts
    .filter((part) => part.retainingEntrance)
    .map((part) => {
      const entrance = part.retainingEntrance!;
      const front = Math.min(...part.footprint.map((p) => p[1]));
      const back = Math.max(...part.footprint.map((p) => p[1]));
      const localBounds = {
        west: entrance.wallSpan[0],
        east: entrance.wallSpan[1],
        south: front - entrance.approachDepth,
        north: back + entrance.upperGradeDepth,
      };
      const margin = BANK_BLEND_WIDTH;
      const vertices = [
        [localBounds.west - margin, localBounds.south - margin],
        [localBounds.west - margin, localBounds.north + margin],
        [localBounds.east + margin, localBounds.south - margin],
        [localBounds.east + margin, localBounds.north + margin],
      ].map((point) => localToGeographic(building, point as LocalPoint));
      return {
        building,
        part,
        entrance,
        back,
        localBounds,
        bounds: {
          west: Math.min(...vertices.map((p) => p.longitude)),
          east: Math.max(...vertices.map((p) => p.longitude)),
          south: Math.min(...vertices.map((p) => p.latitude)),
          north: Math.max(...vertices.map((p) => p.latitude)),
        },
      };
    }),
);

/** Join the lower forecourt and upper field only around the photographed retaining line. */
export function gradeRetainingHeight(
  longitude: number,
  latitude: number,
  originalHeight: number,
  groundLevels: Map<string, number>,
) {
  let height = originalHeight;
  for (const patch of retainingPatches) {
    const { west, east, south, north } = patch.bounds;
    if (
      longitude < west ||
      longitude > east ||
      latitude < south ||
      latitude > north
    )
      continue;
    const datum = groundLevels.get(patch.building.id);
    if (datum === undefined) continue;
    const [e, n] = geographicToLocal(patch.building, longitude, latitude),
      box = patch.localBounds;
    const outside = Math.hypot(
      Math.max(box.west - e, 0, e - box.east),
      Math.max(box.south - n, 0, n - box.north),
    );
    if (outside >= BANK_BLEND_WIDTH) continue;
    const t = outside / BANK_BLEND_WIDTH,
      blend = t * t * (3 - 2 * t);
    // Leave a shallow recess behind the portal face before the upper soil begins.
    const grade =
      datum +
      patch.part.baseHeight +
      (n > patch.back + 0.7 ? patch.entrance.wallHeight : 0);
    height = grade + (originalHeight - grade) * blend;
  }
  return height;
}

function shorelineDistance(point: LocalPoint, outline: LocalPoint[]) {
  let inside = false;
  let distance = Infinity;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[j],
      b = outline[i];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy),
      ),
    );
    distance = Math.min(
      distance,
      Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy),
    );
  }
  return { inside, distance };
}

export const photoSitePatches = photoSiteGrades.map((grade) => {
  const building = geographicBuildings.find((b) => b.id === grade.buildingId)!;
  const vertices = grade.outline.map((p) => localToGeographic(building, p));
  const latitudeMargin = grade.blendWidth / EARTH_RADIUS / RAD;
  const longitudeMargin = latitudeMargin / Math.cos(building.anchor.latitude * RAD);
  return { building, grade, bounds: {
    west:Math.min(...vertices.map(p=>p.longitude))-longitudeMargin,
    east:Math.max(...vertices.map(p=>p.longitude))+longitudeMargin,
    south:Math.min(...vertices.map(p=>p.latitude))-latitudeMargin,
    north:Math.max(...vertices.map(p=>p.latitude))+latitudeMargin,
  }};
});

function profileHeight(profile: {north:number;height:number}[], north:number) {
  if (north <= profile[0].north) return profile[0].height;
  for (let i=1;i<profile.length;i++) {
    if (north <= profile[i].north) {
      const a=profile[i-1],b=profile[i],t=(north-a.north)/(b.north-a.north);
      return a.height+(b.height-a.height)*t;
    }
  }
  return profile[profile.length-1].height;
}

/** Grade only source-observed gardens/forecourts; original DEM resumes outside each margin. */
export function gradePhotoSiteHeight(longitude:number,latitude:number,originalHeight:number,datums:Map<string,number>,terrainLevel?:number) {
  let height=originalHeight;
  for (const patch of photoSitePatches) {
    if(terrainLevel!==undefined&&terrainLevel<(patch.grade.minTerrainLevel??17))continue;
    const {west,east,south,north}=patch.bounds;
    if(longitude<west||longitude>east||latitude<south||latitude>north)continue;
    const datum=datums.get(patch.building.id);
    if(datum===undefined)continue;
    const point=geographicToLocal(patch.building,longitude,latitude);
    // Current Haku photos show land immediately at the steps but water under
    // the pavilion. A blending margin must not raise that water-side bed.
    const water=waterSurfaceFor(patch.building);
    if(patch.grade.clipToLand&&water&&shorelineDistance(point,water.outline).inside)continue;
    const {inside,distance}=shorelineDistance(point,patch.grade.outline);
    if(!inside&&distance>=patch.grade.blendWidth)continue;
    let relative=profileHeight(patch.grade.heightProfile,point[1]);
    const corridor=patch.grade.stairCorridor;
    if(corridor){
      const part=patch.building.parts.find(p=>p.id===corridor.partId)!;
      const entrance=part.entrance!;
      const front=Math.min(...part.footprint.map(p=>p[1]))-1;
      const travel=Math.max(0,Math.min(entrance.depth,front-point[1]));
      const landing=entrance.landing;
      let stairTop:number;
      if(landing&&travel<=landing.start){
        stairTop=entrance.rise+(landing.rise-entrance.rise)*travel/landing.start;
      }else if(landing&&travel<=landing.start+landing.depth){
        stairTop=landing.rise;
      }else{
        const start=landing?landing.start+landing.depth:0;
        const initial=landing?landing.rise:entrance.rise;
        stairTop=initial+(corridor.endHeight-initial)*(travel-start)/(entrance.depth-start);
      }
      const clearance=corridor.understepClearance*(1-travel/entrance.depth);
      const outside=Math.max(0,Math.abs(point[0]-(corridor.centerEast??0))-corridor.halfWidth);
      const t=Math.min(1,outside/corridor.blendWidth),blend=t*t*(3-2*t);
      relative=(stairTop-clearance)*(1-blend)+relative*blend;
    }
    const t=inside?0:distance/patch.grade.blendWidth,blend=t*t*(3-2*t);
    height=datum+relative+(originalHeight-datum-relative)*blend;
  }
  return height;
}

export function gradeShorelineHeight(
  longitude: number,
  latitude: number,
  originalHeight: number,
  waterLevels: Map<string, number>,
) {
  let height = originalHeight;
  for (const patch of shorelinePatches) {
    const { west, east, south, north } = patch.bounds;
    if (
      longitude < west ||
      longitude > east ||
      latitude < south ||
      latitude > north
    )
      continue;
    const waterLevel = waterLevels.get(patch.building.id);
    if (waterLevel === undefined) continue;
    const { inside, distance } = shorelineDistance(
      geographicToLocal(patch.building, longitude, latitude),
      patch.outline,
    );
    // Sink only the interpreted pool bed. At the edge the bed meets water;
    // the bank rises smoothly and rejoins the original DEM within six metres.
    if (inside) height = waterLevel - 0.45 * Math.min(1, distance / 1.5);
    else if (distance < BANK_BLEND_WIDTH) {
      const t = distance / BANK_BLEND_WIDTH;
      const blend = t * t * (3 - 2 * t);
      height = waterLevel + (originalHeight - waterLevel) * blend;
    }
  }
  return height;
}

export function tileCoordinates(
  longitude: number,
  latitude: number,
  level: number,
) {
  const count = 2 ** level;
  return {
    x: ((longitude + 180) / 360) * count,
    y: ((1 - Math.asinh(Math.tan(latitude * RAD)) / Math.PI) / 2) * count,
  };
}

export function tileIntersectsShoreline(x: number, y: number, level: number) {
  return shorelinePatches.some(({ bounds }) => {
    const nw = tileCoordinates(bounds.west, bounds.north, level);
    const se = tileCoordinates(bounds.east, bounds.south, level);
    return x + 1 >= nw.x && x <= se.x && y + 1 >= nw.y && y <= se.y;
  });
}

export function tileIntersectsRetaining(x: number, y: number, level: number) {
  return retainingPatches.some(({ bounds }) => {
    const nw = tileCoordinates(bounds.west, bounds.north, level),
      se = tileCoordinates(bounds.east, bounds.south, level);
    return x + 1 >= nw.x && x <= se.x && y + 1 >= nw.y && y <= se.y;
  });
}

export function tileIntersectsPhotoSite(x:number,y:number,level:number) {
  return photoSitePatches.some(({bounds,grade})=>{
    if(level>(grade.maxTerrainLevel??18))return false;
    const nw=tileCoordinates(bounds.west,bounds.north,level),se=tileCoordinates(bounds.east,bounds.south,level);
    return x+1>=nw.x&&x<=se.x&&y+1>=nw.y&&y<=se.y;
  });
}

export function geographicAtTilePoint(x: number, y: number, level: number) {
  const count = 2 ** level;
  return {
    longitude: (x / count) * 360 - 180,
    latitude: Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / count))) / RAD,
  };
}
