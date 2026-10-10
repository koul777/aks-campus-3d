# Haku rafter geometry compact trial

2026-10-10. Opt-in implementation; no default adoption or rendered-quality claim.

## Diagnosis

Read-only inspection of `artifacts/overnight-phase27-final/glb/hakuijeong.glb` gives **15,280,264 bytes and 158,816 triangles**. The large components are:

| Component | Triangles | Exported position vertices |
| --- | ---: | ---: |
| Curved roof skin | 6,048 | 18,144 |
| Ceramic ribs, hips, tile ends | 100,096 | 300,288 |
| Large light timber batch, including rafters and rails | 52,112 | 156,336 |

The skin has four faces, 32 radial bands and 24 lateral subdivisions. Ceramic details generate a separate closed eight-sided cylinder for each radial interval of each rib and hip; the 96 tile ends also have closed geometry. The continuous surface therefore is not the main source of size. Source-supported exposed rafters intersect every actual roof triangle edge and use nine roof rays at each sampling position. The finer curved-roof triangulation multiplies these rafter segments, with duplicate near-coincident and nearly collinear knots. Each closed eight-sided cylinder contributes 32 triangles. Existing export already merges geometry by material and attributes; merging reduces objects without removing the geometry of these subdivisions.

The compact trial deliberately leaves all ceramic geometry untouched. The ceramic batch remains the largest residual cost.

## Bounded change

`BuildModelOptions.hakuGeometry: 'compact'` enables only Haku's `addPavilionDetails` rafter path simplification. Omitted options retain the existing default. `Scene.tsx`, CSS and building/detail/profile data are unchanged. The root integration can map `?hakuGeometry=compact` to this explicit option.

All original roof triangle-edge intersections, eighth-length samples and nine-offset downward ray samples are still collected before simplification. The original sampled centerline remains the constraint. Undefined samples preserve gaps. Source-supported counts are unchanged: 48 side rafters and 12 corner fan rafters, with existing radius and radial segment count; all their plan endpoints remain fixed.

For a proposed merged span, every original intermediate knot must have at most **1 mm absolute vertical error** relative to the endpoint chord. Every retained compact knot is then lowered uniformly by **1 mm**. At the same plan coordinate the resulting centerline can be between **0 and 2 mm below** the original sampled centerline, and cannot be above it. Because each original span and candidate chord are linear between original knots, these knot comparisons bound the full original piecewise-linear path, not only its endpoints. Radius is unchanged. The original clearance deduction (80 mm specified clearance, 70 mm rafter radius and 15 mm reserve) remains intact, with the additional downward offset.

This bound is on rafter centerlines. Cylinder surface orientation changes slightly when adjacent spans merge; the unchanged radius still bounds every cylinder vertically by its centerline plus radius. Dense sampled actual-roof checks additionally test this conservative upper envelope.

No roof silhouette, skin triangulation, UV, tile cap count, ribs, hip ridges, finial, roof material, posts, beams, brackets, rails, piers, bridge, deck, terrain or water is changed. No speculative exterior detail is introduced.

## CPU verification

Run `node scripts/verify-haku-rafter-compact.mjs` and `npx tsc --noEmit`. Both passed. The verifier transpiles only the required model modules into `artifacts/haku-geometry-compact`, generates the actual existing Haku roof and pavilion details with baseline and compact options, and uses Three.js ray intersections without a browser or GPU. Results are stored in `artifacts/haku-geometry-compact/result.json`.

| Check | Result |
| --- | ---: |
| Baseline emitted rafter cylinders | 1,540 |
| Compact emitted rafter cylinders | 536 |
| Baseline rafter triangles | 49,280 |
| Compact rafter triangles | 17,152 |
| Removed rafter triangles | 32,128 (65.19% of rafter triangles) |
| Maximum measured downward centerline deviation | 1.875612 mm |
| Maximum measured upward centerline deviation | 0 mm |
| Original endpoint/midpoint comparisons | 4,620 |
| Compact actual-roof ray hits checked | 24,072 |
| Sampled minimum roof-to-centerline-plus-radius clearance | 94.573959 mm |
| Every non-rafter component's geometry and transform | Exact match |

The internal `sourceSegments: 1904` diagnostic counts all adjacent sampled pairs, including near-coincident pairs that the existing generator skips under its 1 mm cylinder-length cutoff. The emitted baseline comparison above counts actual geometry. Fixture checks also verify preservation of missing-roof gaps and a 10 mm bend that must retain its middle knot.

The expected Haku triangle count is **126,688**, based on the verified 32,128-triangle reduction and captured baseline. With existing unindexed position/normal/UV export, removed vertex attributes would account for about **3,084,288 bytes** before metadata differences. These are predictions, not a captured compact GLB measurement. The root should export and inspect the actual GLB, compare same-camera underside and eave views, and check the total model collection. No production build or browser/GPU work was performed by this implementation agent. Fewer triangles/bytes do not establish faster runtime; no runtime improvement is claimed.

## Files

- `src/haku-rafter-compact.ts`: bounded pure centerline simplifier.
- `src/pavilion-model.ts`: opt-in use after unchanged actual-roof sampling; generation bounds/statistics metadata.
- `src/building-model.ts`: explicit model option threaded to pavilion construction.
- `scripts/verify-haku-rafter-compact.mjs`: actual geometry comparison, clearance sampling and fixture verification.

Retain opt-in status until actual rendered A/B inspection accepts the result.
