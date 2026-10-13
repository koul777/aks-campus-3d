import { useEffect, useRef, useState } from "react";
import {
  ArcGisMapServerImageryProvider,
  Axis,
  BoundingSphere,
  DirectionalLight,
  ImageBasedLighting,
  Cartographic,
  Cartesian3,
  Cartesian2,
  Color,
  HeadingPitchRange,
  Ion,
  LabelStyle,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Model,
  PerspectiveFrustum,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SceneTransforms,
  ShadowMode,
  Transforms,
  VerticalOrigin,
  Viewer,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { campusOrigin, geographicBuildings } from "./data/geographic-buildings";
import {
  createTerrain,
  elevationAt,
  getFacilityElevation,
  sampleBuildingGround,
  getFacilityGroundClearance,
  getVisualGroundElevation,
} from "./terrain";
import { landscapePlants } from "./data/landscape";
import {
  createLandscapeInstancedGlb,
  TREE_SMALL_02_50K_DATUM,
} from "./landscape-model";
import type { Command } from "./App";
import {
  createCampusLife,
  type CampusLife,
  type LifeState,
  type WorldStats,
} from "./campus-life";

type Props = {
  command: Command;
  labels: boolean;
  models: boolean;
  life: LifeState;
  onWorldStats: (stats: WorldStats) => void;
  onSelect: (id: string) => void;
  onStatus: (message: string) => void;
  onFailure: (message: string) => void;
};
function campusRange(viewer: Viewer) {
  const radius = Math.max(
    ...geographicBuildings.map(
      (b) =>
        Math.hypot(
          (b.anchor.longitude - campusOrigin.longitude) * 88400,
          (b.anchor.latitude - campusOrigin.latitude) * 111100,
        ) +
        Math.max(
          ...b.parts.flatMap((p) =>
            p.footprint.map(([x, n]) => Math.hypot(x, n)),
          ),
        ),
    ),
  );
  const aspect =
    viewer.scene.canvas.clientWidth / viewer.scene.canvas.clientHeight;
  return radius * Math.max(2.3, 2 / aspect);
}
export default function Scene({
  command,
  labels,
  models,
  life,
  onWorldStats,
  onSelect,
  onStatus,
  onFailure,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const viewerRef = useRef<Viewer | undefined>(undefined);
  const lifeRef = useRef<CampusLife | undefined>(undefined);
  const lifeState = useRef(life);
  lifeState.current = life;
  const modelRefs = useRef(new Map<string, Model>());
  const auxiliaryModels = useRef<Model[]>([]);
  const auxiliaryUrls = useRef(new Map<Model, string>());
  const modelVisibility = useRef(models);
  modelVisibility.current = models;
  const modelUrls = useRef(new Map<string, string>());
  const heights = useRef(new Map<string, number>());
  const focusTarget = useRef<{ id: string; position: Cartesian3 } | undefined>(
    undefined,
  );
  const onDemandTrial = useRef(
    new URLSearchParams(location.search).get("render") !== "continuous",
  );
  const demandAllowed = useRef(false);
  const stopFocus = useRef<(() => void) | undefined>(undefined);
  const visibility = useRef({ labels, models });
  visibility.current = { labels, models };
  const callbacks = useRef({ onSelect, onStatus, onFailure, onWorldStats });
  callbacks.current = { onSelect, onStatus, onFailure, onWorldStats };
  useEffect(() => {
    demandAllowed.current = false;
    let cancelled = false;
    let viewer: Viewer | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const urls: string[] = [];
    const trialQuery = new URLSearchParams(location.search);
    const photoTrial =
      trialQuery.has("diagnostics") && trialQuery.get("photoPatches") === "1";
    const treeTrial =
      trialQuery.has("diagnostics") && trialQuery.get("landscape") === "1";
    const materialTrial =
      trialQuery.has("diagnostics") && trialQuery.get("materials") === "1";
    const environmentGlassTrial =
      trialQuery.has("diagnostics") &&
      trialQuery.get("glass") === "environment";
    const neutralRoofTrial =
      trialQuery.get("roof") === "neutral"
        ? true
        : trialQuery.get("roof") === "legacy"
          ? false
          : undefined;
    let landscapeModel: Model | undefined;
    const prunedTrial =
      trialQuery.has("diagnostics") && trialQuery.get("planting") === "pruned";
    const clusteredTrial =
      trialQuery.has("diagnostics") &&
      trialQuery.get("planting") === "clustered";
    const diagnostic = {
      stage: "imagery-metadata",
      frames: 0,
      lastRenderAt: 0,
      tileLoadRemaining: -1,
      targetAltitude: null as number | null,
      failures: [] as string[],
    };
    const diagnosticWindow = window as unknown as {
      __aksDiagnostics?: () => unknown;
      __aksLastFailure?: unknown;
      __aksSetShadows?: (enabled: boolean) => void;
      __aksSampleTerrain?: (
        longitude: number,
        latitude: number,
      ) => number | undefined;
      __aksSetEnvironmentFactor?: (value: number) => void;
      __aksSetLighting?: (intensity: number, diffuseDc: number) => void;
      __aksSetModelShadowMode?: (
        mode: "cast" | "enabled" | "receive" | "off",
      ) => void;
      __aksSetShadowSettings?: (size: number, maximumDistance: number) => void;
      __aksViewSelected?: (
        headingDegrees: number,
        pitchDegrees: number,
        range: number,
      ) => void;
      __aksViewFacility?: (
        id: string,
        headingDegrees: number,
        pitchDegrees: number,
        range: number,
      ) => void;
      __aksDemoPose?: (
        scope: "campus" | "selected",
        headingDegrees: number,
        pitchDegrees: number,
        rangeMeters: number,
      ) => boolean;
      __aksDemoCampusRange?: () => number | undefined;
    };
    if (new URLSearchParams(location.search).has("diagnostics"))
      diagnosticWindow.__aksDiagnostics = () => ({
        ...diagnostic,
        renderMode: viewer?.scene.requestRenderMode ? "ondemand" : "continuous",
        renderTrial: onDemandTrial.current,
        renderState: !demandAllowed.current
          ? "startup/final-fit"
          : stopFocus.current
            ? "focus-window"
            : "displayed",
        idleMilliseconds: diagnostic.lastRenderAt
          ? performance.now() - diagnostic.lastRenderAt
          : 0,
        globeTilesLoaded: viewer?.scene.globe.tilesLoaded,
        renderResolution: viewer && {
          devicePixelRatio: window.devicePixelRatio || 1,
          cssWidth: viewer.canvas.clientWidth,
          cssHeight: viewer.canvas.clientHeight,
          width: viewer.canvas.width,
          height: viewer.canvas.height,
          resolutionScale: viewer.resolutionScale,
          useBrowserRecommendedResolution:
            viewer.useBrowserRecommendedResolution,
        },
        modelCount: modelRefs.current.size,
        visibleLabelCount: viewer?.entities.values.filter(
          (entity) => entity.show,
        ).length,
        life: lifeRef.current?.diagnostics(),
        models: [...modelRefs.current.entries()].map(([id, model]) => ({
          id,
          ready: model.ready,
          show: model.show,
          blobUrl: modelUrls.current.get(id),
          groundHeight: heights.current.get(id),
          groundClearance: (() => {
            const building = geographicBuildings.find((b) => b.id === id);
            return building ? getFacilityGroundClearance(building) : undefined;
          })(),
          anchor: geographicBuildings.find((b) => b.id === id)?.anchor,
          boundingSphere: model.ready ? model.boundingSphere : undefined,
          screenPosition:
            model.ready && viewer
              ? SceneTransforms.worldToWindowCoordinates(
                  viewer.scene,
                  model.boundingSphere.center,
                )
              : undefined,
        })),
        camera: viewer?.camera.positionCartographic,
        cameraHeading: viewer?.camera.heading,
        cameraPitch: viewer?.camera.pitch,
        cameraDirection: viewer?.camera.directionWC,
        sceneGlobeHeight: (
          viewer?.scene as unknown as { globeHeight?: number } | undefined
        )?.globeHeight,
        cameraFootpointHeight: viewer?.scene.globe.getHeight(
          viewer.camera.positionCartographic,
        ),
        collisionDetection:
          viewer?.scene.screenSpaceCameraController.enableCollisionDetection,
        selectedTarget: focusTarget.current,
        originTerrainHeight: viewer?.scene.globe.getHeight(
          Cartographic.fromDegrees(
            campusOrigin.longitude,
            campusOrigin.latitude,
          ),
        ),
        primitiveCount: viewer?.scene.primitives.length,
        auxiliaryModels: auxiliaryModels.current.map((model) => ({
          ready: model.ready,
          show: model.show,
          blobUrl: auxiliaryUrls.current.get(model),
          bounds: model.ready ? model.boundingSphere : undefined,
        })),
        trials: {
          photoPatches: photoTrial,
          landscape: treeTrial,
          landscapeReady: landscapeModel?.ready,
          landscapeBounds: landscapeModel?.ready
            ? landscapeModel.boundingSphere
            : undefined,
        },
      });
    if (new URLSearchParams(location.search).has("diagnostics"))
      diagnosticWindow.__aksSetShadows = (enabled) => {
        if (!viewer || viewer.isDestroyed()) return;
        viewer.shadowMap.enabled = enabled;
        viewer.scene.requestRender();
      };
    if (new URLSearchParams(location.search).has("diagnostics"))
      diagnosticWindow.__aksSampleTerrain = (longitude, latitude) => {
        if (!viewer || viewer.isDestroyed()) return undefined;
        return viewer.scene.globe.getHeight(
          Cartographic.fromDegrees(longitude, latitude),
        );
      };
    if (new URLSearchParams(location.search).has("diagnostics"))
      diagnosticWindow.__aksSetEnvironmentFactor = (value) => {
        if (!viewer || viewer.isDestroyed() || !Number.isFinite(value)) return;
        for (const model of modelRefs.current.values())
          model.imageBasedLighting.imageBasedLightingFactor = new Cartesian2(
            1,
            Math.max(0, Math.min(1, value)),
          );
        viewer.scene.requestRender();
      };
    if (new URLSearchParams(location.search).has("diagnostics")) {
      diagnosticWindow.__aksDemoCampusRange = () =>
        viewer && !viewer.isDestroyed() ? campusRange(viewer) : undefined;
      diagnosticWindow.__aksDemoPose = (scope, heading, pitch, range) => {
        if (
          !viewer ||
          viewer.isDestroyed() ||
          ![heading, pitch, range].every(Number.isFinite) ||
          (scope !== "campus" && scope !== "selected")
        )
          return false;
        const selected = focusTarget.current;
        const readyModels = [...modelRefs.current.values()].filter(
          (model) => model.ready,
        );
        if (
          (scope === "selected" && !selected) ||
          (scope === "campus" && !readyModels.length)
        )
          return false;
        // Explicit demo poses take ownership from the terrain focus correction.
        stopFocus.current?.();
        stopFocus.current = undefined;
        const offset = new HeadingPitchRange(
          CesiumMath.toRadians(heading),
          CesiumMath.toRadians(pitch),
          Math.max(2, range),
        );
        if (scope === "selected")
          viewer.camera.lookAt(selected!.position, offset);
        else
          viewer.camera.viewBoundingSphere(
            BoundingSphere.fromBoundingSpheres(
              readyModels.map((model) => model.boundingSphere),
            ),
            offset,
          );
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        viewer.scene.requestRender();
        return true;
      };
      diagnosticWindow.__aksViewSelected = (heading, pitch, range) => {
        const selected = focusTarget.current;
        if (
          !viewer ||
          viewer.isDestroyed() ||
          !selected ||
          ![heading, pitch, range].every(Number.isFinite)
        )
          return;
        viewer.camera.lookAt(
          selected.position,
          new HeadingPitchRange(
            CesiumMath.toRadians(heading),
            CesiumMath.toRadians(pitch),
            Math.max(2, range),
          ),
        );
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        viewer.scene.requestRender();
      };
      diagnosticWindow.__aksViewFacility = (id, heading, pitch, range) => {
        const model = modelRefs.current.get(id);
        if (
          !viewer ||
          viewer.isDestroyed() ||
          !model?.ready ||
          ![heading, pitch, range].every(Number.isFinite)
        )
          return;
        viewer.camera.viewBoundingSphere(
          model.boundingSphere,
          new HeadingPitchRange(
            CesiumMath.toRadians(heading),
            CesiumMath.toRadians(pitch),
            Math.max(2, range),
          ),
        );
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        viewer.scene.requestRender();
      };
      diagnosticWindow.__aksSetLighting = (intensity, diffuseDc) => {
        if (
          !viewer ||
          viewer.isDestroyed() ||
          !Number.isFinite(intensity) ||
          !Number.isFinite(diffuseDc)
        )
          return;
        const clamp = (value: number) => Math.max(0, Math.min(2, value));
        if (viewer.scene.light instanceof DirectionalLight)
          viewer.scene.light.intensity = clamp(intensity);
        for (const model of modelRefs.current.values()) {
          const coefficients =
            model.imageBasedLighting.sphericalHarmonicCoefficients;
          if (coefficients) {
            model.imageBasedLighting.sphericalHarmonicCoefficients = [
              new Cartesian3(
                clamp(diffuseDc),
                clamp(diffuseDc),
                clamp(diffuseDc),
              ),
              ...coefficients.slice(1),
            ];
          }
        }
        viewer.scene.requestRender();
      };
      diagnosticWindow.__aksSetModelShadowMode = (mode) => {
        if (!viewer || viewer.isDestroyed()) return;
        const modes = {
          cast: ShadowMode.CAST_ONLY,
          enabled: ShadowMode.ENABLED,
          receive: ShadowMode.RECEIVE_ONLY,
          off: ShadowMode.DISABLED,
        };
        if (!(mode in modes)) return;
        for (const model of modelRefs.current.values())
          model.shadows = modes[mode];
        viewer.scene.requestRender();
      };
      diagnosticWindow.__aksSetShadowSettings = (size, maximumDistance) => {
        if (
          !viewer ||
          viewer.isDestroyed() ||
          !Number.isFinite(size) ||
          !Number.isFinite(maximumDistance)
        )
          return;
        viewer.shadowMap.size = Math.max(256, Math.min(8192, Math.round(size)));
        viewer.shadowMap.maximumDistance = Math.max(1, maximumDistance);
        viewer.scene.requestRender();
      };
    }
    async function start() {
      try {
        Ion.defaultAccessToken = "";
        const imagery = await ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
          { enablePickFeatures: false },
        );
        if (cancelled) return;
        viewer = new Viewer(container.current!, {
          baseLayer: false,
          terrainProvider: createTerrain(),
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          selectionIndicator: false,
          infoBox: false,
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity,
          shadows: true,
          useBrowserRecommendedResolution: false,
        });
        viewerRef.current = viewer;
        // Keep facility names legible on a narrow screen. Selected and major
        // facilities take priority; zooming in reveals the remaining names.
        viewer.scene.preRender.addEventListener(() => {
          if (!viewer) return;
          const compact = viewer.canvas.clientWidth <= 700;
          const occupied: {
            left: number;
            right: number;
            top: number;
            bottom: number;
          }[] = [];
          const priority = (id: string) =>
            id === focusTarget.current?.id
              ? -2
              : ["main", "library", "hall", "jangseogak", "gate"].includes(id)
                ? -1
                : 0;
          const entities = [...viewer.entities.values].sort(
            (a, b) => priority(a.id) - priority(b.id),
          );
          for (const entity of entities) {
            let show = visibility.current.labels;
            if (show && compact && entity.label && entity.position) {
              const position = entity.position.getValue(
                viewer.clock.currentTime,
              );
              const screen =
                position &&
                SceneTransforms.worldToWindowCoordinates(
                  viewer.scene,
                  position,
                );
              const text = String(
                entity.label.text?.getValue(viewer.clock.currentTime) ?? "",
              );
              const halfWidth =
                [...text].reduce(
                  (sum, letter) => sum + (letter.charCodeAt(0) > 255 ? 14 : 8),
                  8,
                ) / 2;
              if (!screen) show = false;
              else {
                const box = {
                  left: screen.x - halfWidth,
                  right: screen.x + halfWidth,
                  top: screen.y - 22,
                  bottom: screen.y + 4,
                };
                show =
                  box.left >= 4 &&
                  box.right <= viewer.canvas.clientWidth - 4 &&
                  box.bottom >= 0 &&
                  box.top <= viewer.canvas.clientHeight &&
                  !occupied.some(
                    (other) =>
                      box.left < other.right &&
                      box.right > other.left &&
                      box.top < other.bottom &&
                      box.bottom > other.top,
                  );
                if (show) occupied.push(box);
              }
            }
            if (entity.show !== show) entity.show = show;
          }
        });
        viewer.shadowMap.size = 2048;
        viewer.shadowMap.maximumDistance = 1600;
        viewer.shadowMap.darkness = 0.35;
        viewer.shadowMap.normalOffset = true;
        viewer.shadowMap.softShadows = true;
        diagnostic.stage = "viewer-created";
        viewer.scene.postRender.addEventListener(() => {
          diagnostic.frames++;
          diagnostic.lastRenderAt = performance.now();
        });
        viewer.scene.globe.tileLoadProgressEvent.addEventListener(
          (remaining: number) => {
            diagnostic.tileLoadRemaining = remaining;
          },
        );
        viewer.imageryLayers.addImageryProvider(imagery);
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.maximumScreenSpaceError = 1.5;
        // Cesium otherwise ignores DPR. Dividing resolutionScale by DPR while
        // leaving its default enabled rendered a DPR-3 phone at half CSS size.
        // Preserve fine edges at up to 2x CSS resolution, with a pixel budget
        // for large screens. Recalculate after rotation and panel resizing.
        const updateResolution = () => {
          if (!viewer || viewer.isDestroyed()) return;
          const dpr = window.devicePixelRatio || 1;
          const area = Math.max(
            1,
            viewer.canvas.clientWidth * viewer.canvas.clientHeight,
          );
          const ratio = Math.min(
            dpr,
            2,
            Math.max(1, Math.sqrt(2_400_000 / area)),
          );
          const scale = ratio / dpr;
          if (Math.abs(viewer.resolutionScale - scale) > 0.001)
            viewer.resolutionScale = scale;
          viewer.scene.requestRender();
        };
        updateResolution();
        resizeObserver = new ResizeObserver(updateResolution);
        resizeObserver.observe(container.current!);
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 2;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 15000;
        imagery.errorEvent.addEventListener((error: unknown) => {
          diagnostic.failures.push(String(error));
          callbacks.current.onStatus(
            "일부 위성영상 타일을 불러오지 못했습니다.",
          );
        });
        viewer.terrainProvider.errorEvent.addEventListener((error: unknown) => {
          diagnostic.failures.push(String(error));
          callbacks.current.onStatus(
            "일부 실제 지형 타일을 불러오지 못했습니다.",
          );
        });
        viewer.scene.renderError.addEventListener((_scene, error: unknown) => {
          diagnostic.stage = "render-failed";
          const detail =
            error instanceof Error
              ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
              : String(error);
          diagnostic.failures.push(detail);
          if (diagnosticWindow.__aksDiagnostics)
            diagnosticWindow.__aksLastFailure =
              diagnosticWindow.__aksDiagnostics();
          console.error("AKS Cesium render failure", error);
          callbacks.current.onFailure(
            "3D 지도를 표시하지 못했습니다. 브라우저의 WebGL 설정을 확인해 주세요.",
          );
        });
        viewer.scene.canvas.addEventListener("webglcontextlost", () =>
          callbacks.current.onFailure(
            "3D 지도 연결이 끊어졌습니다. 페이지를 다시 불러와 주세요.",
          ),
        );
        diagnostic.stage = "origin-dem";
        const originHeight = await elevationAt(
          campusOrigin.longitude,
          campusOrigin.latitude,
        );
        if (cancelled) return;
        diagnostic.targetAltitude = originHeight;
        const lightFrame = Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(
            campusOrigin.longitude,
            campusOrigin.latitude,
            originHeight,
          ),
        );
        const direction = Matrix4.multiplyByPointAsVector(
          lightFrame,
          new Cartesian3(-0.65, 0.5, -1),
          new Cartesian3(),
        );
        Cartesian3.normalize(direction, direction);
        viewer.scene.light = new DirectionalLight({
          direction,
          color: Color.WHITE,
          intensity: 1.8,
        });
        const target = Cartesian3.fromDegrees(
          campusOrigin.longitude,
          campusOrigin.latitude,
          originHeight,
        );
        viewer.camera.lookAt(
          target,
          new HeadingPitchRange(
            CesiumMath.toRadians(10),
            CesiumMath.toRadians(-52),
            campusRange(viewer),
          ),
        );
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((event: { position: Cartesian2 }) => {
          const hit = viewer!.scene.pick(event.position);
          const id = typeof hit?.id === "string" ? hit.id : hit?.id?.id;
          if (id && geographicBuildings.some((b) => b.id === id))
            callbacks.current.onSelect(id);
        }, ScreenSpaceEventType.LEFT_CLICK);
        for (const b of geographicBuildings) {
          diagnostic.stage = `${b.id}:dem`;
          const elevation = await getFacilityElevation(b);
          heights.current.set(b.id, elevation);
          diagnostic.stage = `${b.id}:glb-export`;
          const refined = ["main", "hall", "library", "jangseogak"].includes(
            b.id,
          );
          const procedural =
            trialQuery.get("models") === "procedural" ||
            (refined && trialQuery.get("blender") === "legacy");
          const staticUrl = procedural
            ? undefined
            : `/models/${refined ? "blender" : "campus"}/${b.id}.glb`;
          const url =
            staticUrl ??
            (await (
              await import("./building-model")
            ).createBuildingGlb(b, await sampleBuildingGround(b), {
              enablePhotoPatches: photoTrial,
              architecturalDetail: trialQuery.get("detail") !== "legacy",
              enableMaterialTrial: materialTrial,
              enableEnvironmentGlass: environmentGlassTrial,
              neutralRoof: neutralRoofTrial,
              continuousRoofUV: trialQuery.get("roofUV") !== "legacy",
              photoGlazing: !["legacy", "environment"].includes(
                trialQuery.get("glass") ?? "",
              ),
              hakuWoodTrial:
                trialQuery.has("diagnostics") &&
                trialQuery.get("wood") === "source",
              hakuWoodNormalOnly:
                trialQuery.has("diagnostics") &&
                trialQuery.get("wood") === "normal",
              hakuWoodTinted:
                trialQuery.has("diagnostics") &&
                trialQuery.get("wood") === "tinted",
              hakuCurvedRoof: trialQuery.get("hakuRoof") !== "legacy",
              hakuGeometry:
                trialQuery.get("hakuGeometry") === "legacy"
                  ? undefined
                  : "compact",
              hakuPlaque:
                trialQuery.get("hakuPlaque") === "legacy" ? undefined : "photo",
              softRoofPattern: trialQuery.get("roofPattern") !== "legacy",
              graduateEntry:
                trialQuery.get("graduateEntry") === "legacy"
                  ? undefined
                  : "open",
              syntheticGlassPattern:
                trialQuery.get("glassPattern") === "legacy",
              translucentWater:
                trialQuery.has("diagnostics") &&
                trialQuery.get("water") === "translucent",
            }));
          modelUrls.current.set(b.id, url);
          if (url.startsWith("blob:")) urls.push(url);
          if (cancelled) break;
          const position = Cartesian3.fromDegrees(
            b.anchor.longitude,
            b.anchor.latitude,
            elevation + getFacilityGroundClearance(b),
          );
          const matrix = Transforms.eastNorthUpToFixedFrame(position);
          const rotation = Matrix4.fromRotationTranslation(
            Matrix3.fromRotationZ(CesiumMath.toRadians(b.rotationDegrees)),
          );
          Matrix4.multiply(matrix, rotation, matrix);
          const lighting = new ImageBasedLighting();
          lighting.imageBasedLightingFactor = new Cartesian2(
            1,
            environmentGlassTrial && b.id === "main" ? 1 : 0,
          );
          lighting.sphericalHarmonicCoefficients = [
            new Cartesian3(0.55, 0.55, 0.55),
            ...Array.from({ length: 8 }, () => new Cartesian3()),
          ];
          diagnostic.stage = `${b.id}:cesium-model-load`;
          const model = await Model.fromGltfAsync({
            url,
            upAxis: Axis.Y,
            forwardAxis: Axis.X,
            imageBasedLighting: lighting,
            modelMatrix: matrix,
            id: b.id,
            allowPicking: true,
            minimumPixelSize: 0,
            shadows: ShadowMode.CAST_ONLY,
          });
          if (cancelled) {
            model.destroy();
            break;
          }
          viewer.scene.primitives.add(model);
          modelRefs.current.set(b.id, model);
          model.show = visibility.current.models;
          const labelHeight =
            Math.max(
              ...b.parts.map((p) => p.baseHeight + p.height + p.roof.height),
            ) + 8;
          viewer.entities.add({
            id: b.id,
            position: Cartesian3.fromDegrees(
              b.anchor.longitude,
              b.anchor.latitude,
              elevation + labelHeight,
            ),
            label: {
              text: b.name,
              font: "14px sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.fromCssColorString("#263e34"),
              outlineWidth: 4,
              style: LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              show: visibility.current.labels,
            },
          });
          viewer.scene.requestRender();
        }
        if (!cancelled) {
          diagnostic.stage = "surroundings-and-campus-life";
          callbacks.current.onStatus(
            "주변 건물과 보행자·차량을 준비하고 있습니다…",
          );
          try {
            const campusLife = await createCampusLife(
              viewer,
              originHeight,
              lifeState.current,
              (stats) => callbacks.current.onWorldStats(stats),
              () => cancelled,
            );
            if (cancelled) {
              campusLife.dispose();
              return;
            }
            lifeRef.current = campusLife;
            campusLife.setState(lifeState.current);
          } catch (error) {
            if (cancelled) return;
            diagnostic.failures.push(`campus-life: ${String(error)}`);
            callbacks.current.onWorldStats({
              surroundings: 0,
              people: 0,
              cars: 0,
              buses: 0,
              loading: false,
              error:
                "주변 건물·시뮬레이션을 불러오지 못했습니다. 새로고침해 다시 시도해 주세요.",
            });
          }
          diagnostic.stage = "waiting-for-rendered-tiles-and-models";
          if (treeTrial) {
            const origin = Cartesian3.fromDegrees(
              campusOrigin.longitude,
              campusOrigin.latitude,
              originHeight,
            );
            const frame = Transforms.eastNorthUpToFixedFrame(origin);
            const inverse = Matrix4.inverse(frame, new Matrix4());
            const instances = [];
            const candidates = landscapePlants.filter(
              (plant) =>
                plant.form === "deciduous" &&
                plant.confidence.position === "medium" &&
                (plant.buildingId === "main" ||
                  plant.buildingId === "munhyeong"),
            );
            for (const plant of candidates) {
              const building = geographicBuildings.find(
                (b) => b.id === plant.buildingId,
              )!;
              const theta = CesiumMath.toRadians(building.rotationDegrees);
              const [e, n] = plant.position;
              const world = Matrix4.multiplyByPoint(
                Transforms.eastNorthUpToFixedFrame(
                  Cartesian3.fromDegrees(
                    building.anchor.longitude,
                    building.anchor.latitude,
                  ),
                ),
                new Cartesian3(
                  e * Math.cos(theta) - n * Math.sin(theta),
                  e * Math.sin(theta) + n * Math.cos(theta),
                  0,
                ),
                new Cartesian3(),
              );
              const cartographic = Cartographic.fromCartesian(world);
              const ground = await getVisualGroundElevation(
                CesiumMath.toDegrees(cartographic.longitude),
                CesiumMath.toDegrees(cartographic.latitude),
              );
              const local = Matrix4.multiplyByPoint(
                inverse,
                Cartesian3.fromRadians(
                  cartographic.longitude,
                  cartographic.latitude,
                  ground,
                ),
                new Cartesian3(),
              );
              const scale = plant.height / TREE_SMALL_02_50K_DATUM.height;
              instances.push({
                id: plant.id,
                translation: [
                  local.x,
                  local.z - TREE_SMALL_02_50K_DATUM.minimumY * scale,
                  -local.y,
                ] as [number, number, number],
                scale: [scale, scale, scale] as [number, number, number],
                yawDegrees: building.rotationDegrees,
              });
            }
            const landscapeUrl = await createLandscapeInstancedGlb(
              "/landscape/tree_small_02_target_50000.glb",
              instances,
            );
            if (landscapeUrl) {
              urls.push(landscapeUrl);
              landscapeModel = await Model.fromGltfAsync({
                url: landscapeUrl,
                modelMatrix: frame,
                upAxis: Axis.Y,
                forwardAxis: Axis.X,
                shadows: ShadowMode.CAST_ONLY,
                allowPicking: false,
              });
              if (cancelled) {
                landscapeModel.destroy();
                return;
              }
              viewer.scene.primitives.add(landscapeModel);
              landscapeModel.show = modelVisibility.current;
              auxiliaryModels.current.push(landscapeModel);
              auxiliaryUrls.current.set(landscapeModel, landscapeUrl);
            }
          }
          if (prunedTrial || clusteredTrial) {
            const building = geographicBuildings.find((b) => b.id === "main")!;
            const originHeight = await getFacilityElevation(building);
            const frame = Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(
                building.anchor.longitude,
                building.anchor.latitude,
                originHeight,
              ),
            );
            const inverse = Matrix4.inverse(frame, new Matrix4());
            const instances = [];
            for (const plant of landscapePlants.filter(
              (plant) =>
                plant.buildingId === "main" &&
                plant.form === "pruned-rounded" &&
                plant.growth === "tree",
            )) {
              const theta = CesiumMath.toRadians(building.rotationDegrees),
                [e, n] = plant.position;
              const world = Matrix4.multiplyByPoint(
                frame,
                new Cartesian3(
                  e * Math.cos(theta) - n * Math.sin(theta),
                  e * Math.sin(theta) + n * Math.cos(theta),
                  0,
                ),
                new Cartesian3(),
              );
              const point = Cartographic.fromCartesian(world);
              const ground = await getVisualGroundElevation(
                CesiumMath.toDegrees(point.longitude),
                CesiumMath.toDegrees(point.latitude),
              );
              const local = Matrix4.multiplyByPoint(
                inverse,
                Cartesian3.fromRadians(point.longitude, point.latitude, ground),
                new Cartesian3(),
              );
              instances.push({
                id: plant.id,
                translation: [local.x, local.z, -local.y] as [
                  number,
                  number,
                  number,
                ],
                height: plant.height,
                crownDiameter: plant.crownDiameter,
                small: plant.id.includes("small"),
              });
            }
            const url = await (
              await import("./pruned-plant-model")
            ).createPrunedPlantGlb(instances, clusteredTrial);
            if (url) {
              urls.push(url);
              const model = await Model.fromGltfAsync({
                url,
                modelMatrix: frame,
                upAxis: Axis.Y,
                forwardAxis: Axis.X,
                shadows: ShadowMode.CAST_ONLY,
                allowPicking: false,
              });
              if (cancelled) {
                model.destroy();
                return;
              }
              viewer.scene.primitives.add(model);
              model.show = modelVisibility.current;
              auxiliaryModels.current.push(model);
              auxiliaryUrls.current.set(model, url);
            }
          }
          const scene = viewer.scene;
          let settledFrames = 0;
          let finalFitFrames = 0;
          let overviewFitted = false;
          const monitor = () => {
            if (cancelled) return;
            if (overviewFitted) {
              finalFitFrames = scene.globe.tilesLoaded ? finalFitFrames + 1 : 0;
              if (finalFitFrames >= 3) {
                demandAllowed.current = true;
                if (onDemandTrial.current) scene.requestRenderMode = true;
                scene.postRender.removeEventListener(monitor);
                scene.requestRender();
              }
              return;
            }
            const modelsReady =
              modelRefs.current.size === geographicBuildings.length &&
              [...modelRefs.current.values()].every((model) => model.ready) &&
              (lifeRef.current?.isReady() ?? true) &&
              auxiliaryModels.current.every((model) => model.ready);
            settledFrames =
              scene.globe.tilesLoaded && modelsReady ? settledFrames + 1 : 0;
            if (settledFrames >= 12) {
              diagnostic.stage = "displayed";
              setReady(true);
              const bounds = BoundingSphere.fromBoundingSpheres(
                [...modelRefs.current.values()].map(
                  (model) => model.boundingSphere,
                ),
              );
              scene.camera.viewBoundingSphere(
                bounds,
                new HeadingPitchRange(
                  CesiumMath.toRadians(10),
                  CesiumMath.toRadians(-52),
                  0,
                ),
              );
              scene.camera.lookAtTransform(Matrix4.IDENTITY);
              callbacks.current.onStatus(
                "위성영상 · 실제 지형 · 건물 형태 표시됨",
              );
              overviewFitted = true;
              scene.requestRender();
            }
          };
          scene.postRender.addEventListener(monitor);
          scene.requestRender();
        }
      } catch (error) {
        diagnostic.stage = "failed";
        diagnostic.failures.push(String(error));
        if (!cancelled)
          callbacks.current.onFailure(
            error instanceof Error
              ? error.message
              : "실제 지도를 불러오지 못했습니다.",
          );
      }
    }
    start();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      lifeRef.current?.dispose();
      lifeRef.current = undefined;
      stopFocus.current?.();
      viewerRef.current = undefined;
      modelRefs.current.clear();
      auxiliaryModels.current = [];
      auxiliaryUrls.current.clear();
      modelUrls.current.clear();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      urls.forEach(URL.revokeObjectURL);
      if (diagnosticWindow.__aksLastFailure)
        diagnosticWindow.__aksDiagnostics = () =>
          diagnosticWindow.__aksLastFailure;
      else delete diagnosticWindow.__aksDiagnostics;
      delete diagnosticWindow.__aksSetShadows;
      delete diagnosticWindow.__aksSampleTerrain;
      delete diagnosticWindow.__aksSetEnvironmentFactor;
      delete diagnosticWindow.__aksSetLighting;
      delete diagnosticWindow.__aksSetModelShadowMode;
      delete diagnosticWindow.__aksSetShadowSettings;
      delete diagnosticWindow.__aksViewFacility;
      delete diagnosticWindow.__aksViewSelected;
      delete diagnosticWindow.__aksDemoPose;
      delete diagnosticWindow.__aksDemoCampusRange;
    };
  }, []);
  useEffect(() => {
    lifeRef.current?.setState(life);
  }, [life]);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const entity of viewer.entities.values) entity.show = labels;
    viewer.scene.requestRender();
  }, [labels]);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const model of modelRefs.current.values()) model.show = models;
    for (const model of auxiliaryModels.current) model.show = models;
    viewer.scene.requestRender();
  }, [models]);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const camera = viewer.camera;
    const previousFocus = focusTarget.current;
    stopFocus.current?.();
    stopFocus.current = undefined;
    focusTarget.current = undefined;
    lifeRef.current?.stopFollowing();
    if (
      command.type === "people" ||
      command.type === "traffic" ||
      command.type === "neighborhood"
    ) {
      lifeRef.current?.view(command.type);
      return;
    }
    const b = geographicBuildings.find((b) => b.id === command.id);
    const origin = b?.anchor ?? campusOrigin;
    const height = b
      ? (heights.current.get(b.id) ?? 0)
      : (viewer.scene.globe.getHeight(
          Cartographic.fromDegrees(origin.longitude, origin.latitude),
        ) ?? 0);
    const selectedModel =
      b?.id === "boinjae" ? modelRefs.current.get(b.id) : undefined;
    const boinBounds = selectedModel?.ready
      ? selectedModel.boundingSphere
      : undefined;
    const target =
      b && command.type !== "focus" && previousFocus?.id === b.id
        ? previousFocus.position
        : b?.id === "boinjae" && command.type === "focus" && boinBounds
          ? Cartesian3.clone(boinBounds.center)
          : Cartesian3.fromDegrees(
              origin.longitude,
              origin.latitude,
              height +
                (b
                  ? Math.max(...b.parts.map((p) => p.baseHeight + p.height)) *
                    0.45
                  : 0),
            );
    if (b) focusTarget.current = { id: b.id, position: target };
    const range = Cartesian3.distance(camera.positionWC, target);
    if (
      !b &&
      ["reset", "top", "oblique"].includes(command.type) &&
      [...modelRefs.current.values()].every((model) => model.ready)
    ) {
      const bounds = BoundingSphere.fromBoundingSpheres(
        [...modelRefs.current.values()].map((model) => model.boundingSphere),
      );
      camera.viewBoundingSphere(
        bounds,
        new HeadingPitchRange(
          CesiumMath.toRadians(10),
          command.type === "top" ? -Math.PI / 2 : CesiumMath.toRadians(-52),
          0,
        ),
      );
      camera.lookAtTransform(Matrix4.IDENTITY);
      viewer.scene.requestRender();
      return;
    }
    if (command.type === "focus" && b) {
      const front = b.parts.find((part) => part.facadeSide) || b.parts[0];
      const side =
        b.focusSide ?? front?.facadeSide ?? front?.columnSide ?? "south";
      const theta = CesiumMath.toRadians(b.rotationDegrees);
      const extents = b.parts.flatMap((p) => p.footprint);
      const width =
        side === "east" || side === "west"
          ? Math.max(...extents.map((p) => p[1])) -
            Math.min(...extents.map((p) => p[1]))
          : Math.max(...extents.map((p) => p[0])) -
            Math.min(...extents.map((p) => p[0]));
      const aspect =
        viewer.scene.canvas.clientWidth / viewer.scene.canvas.clientHeight;
      const small = b.kind === "pavilion";
      let distance = Math.max(
        small ? 19 : 24,
        width * Math.max(1.65, 1.15 / aspect),
      );
      if (
        b.id === "boinjae" &&
        boinBounds &&
        camera.frustum instanceof PerspectiveFrustum
      ) {
        const verticalHalfFov = (camera.frustum.fovy ?? Math.PI / 3) / 2;
        const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
        const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
        // Fit the complete ready model, including the near wing and lowest floor.
        // `distance` is horizontal; the actual eye-to-centre range includes the 25° rise.
        const sphereRange = Math.max(
          (boinBounds.radius * 1.1) / Math.sin(limitingHalfFov),
          boinBounds.radius + camera.frustum.near,
        );
        distance = Math.max(
          distance,
          sphereRange * Math.cos(CesiumMath.toRadians(25)),
        );
      }
      // Diagnostic views reveal both blocks and the low link from local northeast.
      // This selection view is not a measured reference-photo azimuth.
      const outward =
        b.id === "boinjae"
          ? [Math.cos(theta + Math.PI / 4), Math.sin(theta + Math.PI / 4)]
          : side === "east"
            ? [Math.cos(theta), Math.sin(theta)]
            : side === "west"
              ? [-Math.cos(theta), -Math.sin(theta)]
              : side === "north"
                ? [-Math.sin(theta), Math.cos(theta)]
                : [Math.sin(theta), -Math.cos(theta)];
      let cancelled = false;
      let removeMonitor: (() => void) | undefined;
      let focusDeadlineTimer: ReturnType<typeof setTimeout> | undefined;
      if (onDemandTrial.current) viewer.scene.requestRenderMode = false;
      const controller = viewer.scene.screenSpaceCameraController;
      const collisionEnabled = controller.enableCollisionDetection;
      const canvas = viewer.scene.canvas;
      const cancel = () => {
        if (cancelled) return;
        cancelled = true;
        if (focusDeadlineTimer) clearTimeout(focusDeadlineTimer);
        if (stopFocus.current === cancel) stopFocus.current = undefined;
        if (!viewer.isDestroyed()) {
          if (onDemandTrial.current && demandAllowed.current)
            viewer.scene.requestRenderMode = true;
          viewer.scene.requestRender();
        }
        controller.enableCollisionDetection = collisionEnabled;
        removeMonitor?.();
        canvas.removeEventListener("pointerdown", cancel);
        canvas.removeEventListener("wheel", cancel);
        canvas.removeEventListener("keydown", cancel);
      };
      stopFocus.current = cancel;
      focusDeadlineTimer = setTimeout(cancel, 10000);
      canvas.addEventListener("pointerdown", cancel);
      canvas.addEventListener("wheel", cancel);
      canvas.addEventListener("keydown", cancel);
      const frame = Transforms.eastNorthUpToFixedFrame(target);
      const initialUp =
        distance * Math.tan(CesiumMath.toRadians(small ? 8 : 25));
      const initialOffset = new Cartesian3(
        outward[0] * distance,
        outward[1] * distance,
        initialUp,
      );
      const desiredPosition = Matrix4.multiplyByPoint(
        frame,
        initialOffset,
        new Cartesian3(),
      );
      const desiredCartographic = Cartographic.fromCartesian(desiredPosition);
      elevationAt(
        CesiumMath.toDegrees(desiredCartographic.longitude),
        CesiumMath.toDegrees(desiredCartographic.latitude),
      )
        .then((terrainHeight) => {
          if (cancelled || viewer.isDestroyed()) return;
          const targetHeight = Cartographic.fromCartesian(target).height;
          initialOffset.z = Math.max(
            initialUp,
            terrainHeight + (small ? 4 : 10) - targetHeight,
          );
          controller.enableCollisionDetection = false;
          camera.lookAt(target, initialOffset);
          camera.lookAtTransform(Matrix4.IDENTITY);
          focusTarget.current = { id: b.id, position: target };
          let previous = camera.positionWC.clone();
          const deadline = performance.now() + 10000;
          let movedFrames = 0;
          const monitor = () => {
            if (cancelled || performance.now() > deadline) {
              cancel();
              return;
            }
            movedFrames++;
            const footpointHeight = viewer.scene.globe.getHeight(
              camera.positionCartographic,
            );
            // initializeFrame refreshes the camera's terrain height after the move.
            // Wait for rendered frames and the public terrain sample, then restore collisions.
            if (
              movedFrames >= 3 &&
              footpointHeight !== undefined &&
              Math.abs(footpointHeight - terrainHeight) < 3
            )
              controller.enableCollisionDetection = collisionEnabled;
            if (Cartesian3.distance(previous, camera.positionWC) < 0.25) {
              if (
                onDemandTrial.current &&
                movedFrames >= 3 &&
                controller.enableCollisionDetection === collisionEnabled &&
                viewer.scene.globe.tilesLoaded
              )
                cancel();
              return;
            }
            previous = camera.positionWC.clone();
            const direction = Cartesian3.normalize(
              Cartesian3.subtract(target, previous, new Cartesian3()),
              new Cartesian3(),
            );
            const up = Cartesian3.normalize(previous, new Cartesian3());
            camera.setView({
              destination: previous,
              orientation: { direction, up },
            });
          };
          removeMonitor = viewer.scene.postRender.addEventListener(monitor);
          viewer.scene.requestRender();
        })
        .catch((error) => {
          cancel();
          if (!viewer.isDestroyed())
            callbacks.current.onStatus(
              `선택 위치의 지형을 확인하지 못했습니다: ${String(error)}`,
            );
        });
    } else if (command.type === "in") camera.zoomIn(range * 0.2);
    else if (command.type === "out") camera.zoomOut(range * 0.25);
    else {
      const heading =
        command.type === "left"
          ? camera.heading - 0.3
          : command.type === "right"
            ? camera.heading + 0.3
            : CesiumMath.toRadians(10);
      const pitch =
        command.type === "top"
          ? -Math.PI / 2
          : command.type === "left" || command.type === "right"
            ? camera.pitch
            : CesiumMath.toRadians(-52);
      const distance =
        command.type === "focus"
          ? 270
          : command.type === "left" || command.type === "right"
            ? range
            : b
              ? Math.max(
                  24,
                  modelRefs.current.get(b.id)?.boundingSphere.radius ?? range,
                ) * 3
              : campusRange(viewer);
      camera.lookAt(target, new HeadingPitchRange(heading, pitch, distance));
      camera.lookAtTransform(Matrix4.IDENTITY);
    }
    viewer.scene.requestRender();
  }, [command]);
  return (
    <>
      <div ref={container} className="cesium-host" />
      {!ready && (
        <div className="map-preparing" role="status">
          <span className="loading-ring" />
          <strong>실제 캠퍼스를 불러오고 있습니다</strong>
          <p>위성영상 · 고도 지형 · {geographicBuildings.length}개 시설 형태</p>
        </div>
      )}
    </>
  );
}
