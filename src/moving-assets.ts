import type { ActorAsset } from "./moving-models";

/** Pre-exported rigs avoid generating and serializing nine GLBs on every visit. */
export async function loadMovingAssets(): Promise<ActorAsset[]> {
  if (new URLSearchParams(location.search).get("actors") !== "procedural") {
    try {
      const response = await fetch("/models/moving/manifest.json");
      if (response.ok) {
        const manifest = (await response.json()) as { assets: ActorAsset[] };
        if (
          manifest.assets.length === 9 &&
          manifest.assets.every((a) => a.url.startsWith("/models/moving/"))
        )
          return manifest.assets;
      }
    } catch {
      /* The source generator remains available when the local manifest is unavailable. */
    }
  }
  return (await import("./moving-models")).createMovingAssets();
}
