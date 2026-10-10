/** Haku-only shape trial. Source-observed silhouette; numerical dimensions are modelling estimates. */
export const hakuRoofProfileTrial = {
  buildingId: 'hakuijeong',
  partId: 'hakuijeong-pavilion',
  enabledByDefault: true,
  status: 'adopted-source-estimated-curvature-after-phase25-actual-review',
  sourceContract: 'docs/overnight/2026-10-10/haku-curved-roof-contract.md',
  /** r is square-ring radius / existing radial-expanded eave extent, not / post span. */
  rings: [
    { radius: 0.28, height: 0.52, cornerLift: 0.0 },
    { radius: 0.58, height: 0.18, cornerLift: 0.025 },
    { radius: 0.82, height: -0.01, cornerLift: 0.11 },
    { radius: 1.0, height: -0.07058823529411765, cornerLift: 0.20588235294117646 },
  ],
  apex: { radius: 0, height: 1 },
  heightRule: 'eaveDatum + roof.height * (ring.height + ring.cornerLift * sideParameterSquared)',
  sideParameterRange: [-1, 1],
  subdivisionsPerSide: 24,
  ridgeRadiusMetres: 0.075,
  tilePitchMetres: 0.23,
  tileEnds: {
    perSide: 24,
    radiusMetres: 0.072,
    depthMetres: 0.035,
    surfaceOffsetMetres: 0.022,
    radialSegments: 10,
    relief: 'plain shallow end; no invented flower crest or writing',
  },
  headBeam: {
    depthMetres: 0.32,
    lowerEdgeReliefMetres: 0.035,
    reliefPitchMetres: 0.18,
    relief: 'restrained rounded lower-edge silhouette only; no floral carving reconstruction',
  },
  preserve: [
    'existing geographical centre and terrain/water datum',
    '4.4m square post footprint and post heights',
    'existing deck, pale piers, bridge and railing access gap',
    'existing radial-expanded eave footprint',
    'existing roof apex datum and finial',
    'outer eave midpoint -0.12m and corner +0.23m relative to eave datum',
  ],
} as const;
