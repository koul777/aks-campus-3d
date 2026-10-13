import {
  Axis,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Credit,
  HeadingPitchRange,
  ImageBasedLighting,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Model,
  ModelAnimationLoop,
  ShadowMode,
  Transforms,
  type Viewer,
} from "cesium";
import { campusOrigin } from "./data/geographic-buildings";
import {
  getSurroundingBuildings,
  loadSurroundings,
  toGeographic,
  surroundingsSignature,
} from "./data/surroundings";
import { createRouteSpecs, type RouteSpec } from "./data/campus-routes";
import {
  buildSampledRoute,
  sampleRoute,
  type SampledRoute,
} from "./route-math";
import { getVisualGroundElevation } from "./terrain";
import { loadSurroundingsAsset } from "./surroundings-asset";
import type { ActorKind } from "./moving-models";
import { loadMovingAssets } from "./moving-assets";
import { createRoadSurfaces } from "./road-surfaces";

export type LifeState = {
  surroundings: boolean;
  people: boolean;
  traffic: boolean;
  playing: boolean;
};
export type WorldStats = {
  surroundings: number;
  people: number;
  cars: number;
  buses: number;
  loading: boolean;
  error?: string;
};
type Actor = {
  id: string;
  kind: ActorKind;
  model: Model;
  route: SampledRoute;
  spec: RouteSpec;
  phase: number;
  speed: number;
  distance: number;
  position: Cartesian3;
  groundHeight: number;
  animationReady: boolean;
};
export type CampusLife = {
  setState: (state: LifeState) => void;
  dispose: () => void;
  isReady: () => boolean;
  view: (kind: "people" | "traffic" | "neighborhood") => void;
  stopFollowing: () => void;
  diagnostics: () => unknown;
};

function lighting() {
  const light = new ImageBasedLighting();
  light.imageBasedLightingFactor = new Cartesian2(1, 0);
  light.sphericalHarmonicCoefficients = [
    new Cartesian3(0.5, 0.5, 0.5),
    ...Array.from({ length: 8 }, () => new Cartesian3()),
  ];
  return light;
}

export async function createCampusLife(
  viewer: Viewer,
  originHeight: number,
  initial: LifeState,
  onStats: (stats: WorldStats) => void,
  cancelled: () => boolean,
): Promise<CampusLife> {
  let state = { ...initial },
    disposed = false,
    elapsed = 0,
    lastFrame = performance.now(),
    lastTick = 0;
  let neighborhood: Model | undefined,
    roads: Awaited<ReturnType<typeof createRoadSurfaces>> | undefined,
    following: Actor | undefined,
    removeUpdate: (() => void) | undefined;
  const models: Model[] = [],
    urls: string[] = [],
    actors: Actor[] = [];
  const credit = new Credit(
    '<a href="/data/attribution.html" target="_blank" rel="noopener">© OpenStreetMap · Overture · Qian Shi et al.</a>',
    true,
  );
  const stopped = () => disposed || cancelled() || viewer.isDestroyed();
  const canvas = viewer.scene.canvas;
  const stopFollowing = () => {
    following = undefined;
    if (!viewer.isDestroyed()) viewer.camera.lookAtTransform(Matrix4.IDENTITY);
  };
  const dispose = () => {
    disposed = true;
    removeUpdate?.();
    roads?.dispose();
    canvas.removeEventListener("pointerdown", stopFollowing);
    canvas.removeEventListener("wheel", stopFollowing);
    canvas.removeEventListener("keydown", stopFollowing);
    if (!viewer.isDestroyed()) {
      viewer.cesiumWidget.creditDisplay.removeStaticCredit(credit);
      for (const model of models) viewer.scene.primitives.remove(model);
    }
    urls.forEach(URL.revokeObjectURL);
  };
  const addModel = async (
    url: string,
    id: string,
    matrix: Matrix4,
    shadows = ShadowMode.CAST_ONLY,
  ) => {
    const model = await Model.fromGltfAsync({
      url,
      id,
      modelMatrix: matrix,
      upAxis: Axis.Y,
      forwardAxis: Axis.X,
      allowPicking: false,
      imageBasedLighting: lighting(),
      shadows,
    });
    if (stopped()) {
      model.destroy();
      throw new DOMException("Scene was closed", "AbortError");
    }
    viewer.scene.primitives.add(model);
    models.push(model);
    return model;
  };
  try {
    const data = await loadSurroundings();
    if (stopped()) throw new DOMException("Scene was closed", "AbortError");
    const buildings = getSurroundingBuildings(data);
    let surrounding = await loadSurroundingsAsset(
      buildings,
      originHeight,
      stopped,
    );
    if (surrounding.url.startsWith("blob:")) urls.push(surrounding.url);
    const placeSurroundings = () =>
      addModel(
        surrounding.url,
        "surroundings",
        Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(
            campusOrigin.longitude,
            campusOrigin.latitude,
            surrounding.originHeight,
          ),
        ),
      );
    try {
      neighborhood = await placeSurroundings();
    } catch (error) {
      if (surrounding.source !== "Blender" || stopped()) throw error;
      surrounding = {
        ...(await (
          await import("./surroundings-model")
        ).createSurroundingsGlb(buildings, originHeight, stopped)),
        originHeight,
        source: "procedural",
      };
      urls.push(surrounding.url);
      neighborhood = await placeSurroundings();
    }
    neighborhood.show = state.surroundings;
    viewer.cesiumWidget.creditDisplay.addStaticCredit(credit);
    const assets = await loadMovingAssets();
    urls.push(
      ...assets.map((a) => a.url).filter((url) => url.startsWith("blob:")),
    );
    const specs = createRouteSpecs(data);
    roads = await createRoadSurfaces(viewer, specs, stopped);
    const routeDiagnostics: (Pick<
      RouteSpec,
      "id" | "name" | "kind" | "closed" | "lane" | "source"
    > & { length: number; points: SampledRoute["points"] })[] = [];
    for (const spec of specs) {
      if (stopped()) throw new DOMException("Scene was closed", "AbortError");
      const heights = await Promise.all(
        spec.points.map((point) =>
          getVisualGroundElevation(...toGeographic(point)),
        ),
      );
      const route = buildSampledRoute(
        spec.id,
        spec.points,
        heights,
        spec.closed,
      );
      routeDiagnostics.push({
        id: spec.id,
        name: spec.name,
        kind: spec.kind,
        length: route.length,
        closed: route.closed,
        lane: spec.lane,
        source: spec.source,
        points: route.points,
      });
      const choices = assets.filter((a) => a.kind === spec.kind);
      for (let index = 0; index < spec.count; index++) {
        const asset = choices[index % choices.length];
        const id = `life:${spec.id}:${index}`;
        // Public road cars and buses share a speed and disjoint phases, preserving their spacing.
        const offset =
          spec.kind === "bus" ? 0.115 : spec.kind === "person" ? 0.07 : 0.04;
        const phase = (index / spec.count + offset) % 1;
        // Equal speed within each pedestrian loop prevents actors overtaking through each other.
        const speed = spec.speed;
        const sampled = sampleRoute(route, phase * route.length, spec.lane);
        const position = Cartesian3.fromDegrees(
          ...toGeographic([sampled.east, sampled.north]),
          sampled.height + 0.06,
        );
        const shadowMode =
          new URLSearchParams(location.search).get("lifeShadows") === "off"
            ? ShadowMode.DISABLED
            : ShadowMode.ENABLED;
        const model = await addModel(
          asset.url,
          id,
          Transforms.eastNorthUpToFixedFrame(position),
          shadowMode,
        );
        const actor: Actor = {
          id,
          kind: spec.kind,
          model,
          route,
          spec,
          phase,
          speed,
          distance: phase * route.length,
          position,
          groundHeight: sampled.height,
          animationReady: false,
        };
        actors.push(actor);
        model.show = spec.kind === "person" ? state.people : state.traffic;
      }
    }
    const counts = {
      surroundings: buildings.length,
      people: actors.filter((a) => a.kind === "person").length,
      cars: actors.filter((a) => a.kind === "car").length,
      buses: actors.filter((a) => a.kind === "bus").length,
      loading: false,
    };
    onStats(counts);
    const rotation = new Matrix4(),
      yaw = new Matrix3(),
      pitch = new Matrix3(),
      orientation = new Matrix3();
    const at = new Cartographic();
    const updateActor = (actor: Actor) => {
      const layerVisible =
        actor.kind === "person" ? state.people : state.traffic;
      if (!layerVisible) {
        actor.model.show = false;
        return;
      }
      actor.distance =
        (actor.phase * actor.route.length + elapsed * actor.speed) %
        actor.route.length;
      const sample = sampleRoute(actor.route, actor.distance, actor.spec.lane);
      const [lon, lat] = toGeographic([sample.east, sample.north]);
      at.longitude = CesiumMath.toRadians(lon);
      at.latitude = CesiumMath.toRadians(lat);
      at.height = 0;
      const visibleGround = viewer.scene.globe.getHeight(at);
      actor.groundHeight = Number.isFinite(visibleGround)
        ? visibleGround!
        : sample.height;
      actor.position = Cartesian3.fromDegrees(
        lon,
        lat,
        actor.groundHeight + (actor.kind === "person" ? 0.022 : 0.12),
        undefined,
        actor.position,
      );
      const frame = Transforms.eastNorthUpToFixedFrame(actor.position);
      const ahead = sampleRoute(
        actor.route,
        actor.distance + (actor.kind === "person" ? 0.6 : 2.5),
        actor.spec.lane,
      );
      const behind = sampleRoute(
        actor.route,
        actor.distance - (actor.kind === "person" ? 0.6 : 2.5),
        actor.spec.lane,
      );
      const tangentEast = ahead.east - behind.east,
        tangentNorth = ahead.north - behind.north;
      Matrix3.fromRotationZ(Math.atan2(tangentEast, -tangentNorth), yaw);
      const grade =
        actor.kind === "person"
          ? 0
          : Math.atan2(
              ahead.height - behind.height,
              Math.hypot(tangentEast, tangentNorth),
            );
      Matrix3.fromRotationX(-Math.max(-0.22, Math.min(0.22, grade)), pitch);
      Matrix3.multiply(yaw, pitch, orientation);
      Matrix4.fromRotationTranslation(orientation, Cartesian3.ZERO, rotation);
      actor.model.modelMatrix = Matrix4.multiply(frame, rotation, frame);
      actor.model.show =
        layerVisible &&
        (actor.route.closed ||
          (actor.distance > 12 && actor.distance < actor.route.length - 12));
      if (
        actor.kind === "person" &&
        actor.model.ready &&
        !actor.animationReady
      ) {
        actor.model.activeAnimations.animateWhilePaused = true;
        actor.model.activeAnimations.add({
          name: "walk",
          loop: ModelAnimationLoop.REPEAT,
          animationTime: (_duration) =>
            (((elapsed * actor.speed) / 1.15 + actor.phase * 1.18) % 1.18) /
            1.18,
        });
        actor.animationReady = true;
      }
    };
    let dirty = true;
    removeUpdate = viewer.scene.preUpdate.addEventListener(() => {
      if (stopped() || document.hidden) return;
      const now = performance.now(),
        delta = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const active = state.playing && (state.people || state.traffic);
      if (active) elapsed += delta;
      const warming =
        state.people &&
        actors.some((a) => a.kind === "person" && !a.animationReady);
      if (!dirty && !warming && (!active || now - lastTick < 1000 / 30)) return;
      lastTick = now - ((now - lastTick) % (1000 / 30));
      dirty = false;
      actors.forEach(updateActor);
      if (following) {
        if (!following.model.show) {
          stopFollowing();
        } else {
          viewer.camera.lookAt(
            following.position,
            new HeadingPitchRange(
              CesiumMath.toRadians(following.kind === "person" ? 28 : 35),
              CesiumMath.toRadians(following.kind === "person" ? -19 : -22),
              following.kind === "person" ? 15 : 38,
            ),
          );
          viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        }
      }
      viewer.scene.requestRender();
    });
    canvas.addEventListener("pointerdown", stopFollowing);
    canvas.addEventListener("wheel", stopFollowing, { passive: true });
    canvas.addEventListener("keydown", stopFollowing);
    return {
      dispose,
      stopFollowing,
      isReady: () => models.every((m) => m.ready) && !!roads?.isReady(),
      setState(next) {
        state = { ...next };
        neighborhood!.show = state.surroundings;
        dirty = true;
        lastFrame = performance.now();
        viewer.scene.requestRender();
      },
      view(kind) {
        stopFollowing();
        if (kind === "neighborhood") {
          viewer.camera.lookAt(
            Cartesian3.fromDegrees(127.05645, 37.3926, originHeight + 12),
            new HeadingPitchRange(
              CesiumMath.toRadians(12),
              CesiumMath.toRadians(-38),
              550,
            ),
          );
          viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        } else {
          const candidates = actors.filter(
            (a) => a.kind === (kind === "people" ? "person" : "bus"),
          );
          // Choose the actor nearest the campus, never an off-screen respawn boundary.
          following =
            candidates
              .filter((a) => a.model.show)
              .sort((a, b) => {
                const sa = sampleRoute(a.route, a.distance),
                  sb = sampleRoute(b.route, b.distance);
                return (
                  Math.hypot(sa.east - 70, sa.north + 65) -
                  Math.hypot(sb.east - 70, sb.north + 65)
                );
              })[0] ?? candidates[0];
        }
        dirty = true;
        viewer.scene.requestRender();
      },
      diagnostics: () => ({
        ...counts,
        ready: models.every((m) => m.ready) && !!roads?.isReady(),
        roadSurfaces: roads?.details,
        roadsReady: roads?.isReady(),
        state,
        elapsed,
        following: following?.id,
        surroundingReady: neighborhood?.ready,
        surroundingVisible: neighborhood?.show,
        surroundingMeshes: surrounding.meshes,
        surroundingBuildings: surrounding.diagnostics,
        surroundingUrl: surrounding.url,
        surroundingOriginHeight: originHeight,
        surroundingSource: surrounding.source,
        surroundingGeometrySignature: surroundingsSignature(buildings),
        assetUrls: assets,
        routeDetails: routeDiagnostics,
        actors: actors.map((a) => ({
          id: a.id,
          kind: a.kind,
          ready: a.model.ready,
          show: a.model.show,
          distance: a.distance,
          speed: a.speed,
          groundHeight: a.groundHeight,
          position: a.position,
          route: a.route.id,
          animationReady: a.animationReady,
        })),
      }),
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
