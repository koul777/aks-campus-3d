import {
  surroundingsSignature,
  type SurroundingBuilding,
} from "./data/surroundings";

type BuildingDiagnostic = {
  id: string;
  height: number;
  heightSource: string;
  groundMin: number;
  groundMax: number;
};
type Metadata = {
  geometrySignature: string;
  groundHeight: number;
  buildings: BuildingDiagnostic[];
  meshes: number;
};
export type SurroundingsAsset = {
  url: string;
  diagnostics: BuildingDiagnostic[];
  meshes: number;
  originHeight: number;
  source: "Blender" | "procedural";
};

export async function loadSurroundingsAsset(
  buildings: SurroundingBuilding[],
  originHeight: number,
  cancelled: () => boolean,
): Promise<SurroundingsAsset> {
  if (
    new URLSearchParams(location.search).get("surroundings") !== "procedural"
  ) {
    try {
      const response = await fetch("/models/blender/surroundings.json");
      if (response.ok) {
        const metadata = (await response.json()) as Metadata;
        if (
          metadata.geometrySignature === surroundingsSignature(buildings) &&
          Math.abs(metadata.groundHeight - originHeight) < 0.05
        ) {
          return {
            url: "/models/blender/surroundings.glb",
            diagnostics: metadata.buildings,
            meshes: metadata.meshes,
            originHeight: metadata.groundHeight,
            source: "Blender",
          };
        }
      }
    } catch (error) {
      if (cancelled()) throw error;
    }
  }
  return {
    ...(await (
      await import("./surroundings-model")
    ).createSurroundingsGlb(buildings, originHeight, cancelled)),
    originHeight,
    source: "procedural",
  };
}
