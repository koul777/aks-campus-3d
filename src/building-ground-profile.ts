/** Terrain samples expressed in metres relative to model datum plus clearance. */
export type BuildingGroundProfile = {
  parts: Record<string, { edgeHeights: number[]; entryGroundHeight?: number }>;
  bridgeLandingHeight?: number;
  accessStairGroundHeight?: number;
};
