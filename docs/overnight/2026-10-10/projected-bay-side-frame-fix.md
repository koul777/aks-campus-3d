# Projected bay side frame occlusion fix

2026-10-10. Source-supported default geometry bug fix; root rendered review remains required.

## Evidence and defect

Visually inspected original local references:

- `references/research-20261010/foliage-source/facility-review/gugeun-detail.jpg`: upper portrait bays project from the wall, with visible narrow glazed returns and pale perimeter frames; lower windows are flat.
- `references/research-20261010/foliage-source/facility-review/jinhyeon.jpg`: both window rows contain projected bays with glazed returns and pale front/rear perimeter posts.

These images support exposed side glazing, not exact measured dimensions. Existing descriptor dimensions remain estimates and were not changed.

The previous `photoBayWindows` builder added side glass at `x = ±0.825`, thickness 0.055 m, with depth interval `z = [0.15, 0.55]`. It then added a full-depth opaque side frame at `x = ±0.865`, width 0.10 m, depth interval `z = [-0.04, 0.59]`. On the right side, its `x = [0.815, 0.915]` footprint completely enclosed the side pane's `x = [0.7975, 0.8525]` outer surface. Side-facing rays therefore hit an opaque slab before reaching the intended glass.

## Change and scope

Only projected rows replace each full-depth opaque side frame with two narrow perimeter jambs. Each retains the existing 0.10 m width, `row.height + 0.16` height, x-position and pale material. Its depth is 0.10 m, with centres at z = 0.20 and 0.50. Their depth intervals are `[0.15, 0.25]` and `[0.45, 0.55]`, leaving side glass exposed in `[0.25, 0.45]`.

Posts stay entirely within the existing side glazing's depth interval. The front pane remains at 0.55 m projection, side pane depth remains 0.40 m, and the cap geometry already establishes the overall bay envelope. No projection depth or envelope increase is introduced.

The current `photoBayWindows` users are only `gugeun-body` and `jinhyeon-body`. Scope is six upper Gugeun bays and twelve Jinhyeon bays. All four flat lower Gugeun bays retain the original complete geometry. Row heights, widths, counts, centres, projectionDepth, sidePaneWidth, front/side pane meshes, top/bottom caps, central mullions and material colours are unchanged. No other buildings, Scene, CSS or data were edited for this fix. The previous Haku compact trial remains separately opt-in.

The extra front/rear post per side adds two boxes (24 triangles) per projected bay: 432 triangles across the 18 affected bays. This is a fidelity correction, not a geometry reduction or performance claim.

## Verification

Passed `node scripts/verify-projected-bay-side-frames.mjs` and `npx tsc --noEmit`.

The CPU verifier extracts and executes the **actual current `addVerifiedDetails` function and material factory** from `src/building-model.ts`, using the actual building descriptors. It compares this result to a literal reconstruction of the previous complete bay mesh contract. It also confirms that the descriptor's only current users are Gugeun and Jinhyeon.

| Check | Result |
| --- | ---: |
| Projected bays generated and checked | 18 |
| Flat Gugeun lower bays: all geometry/transforms/materials exact match | 4 |
| Projected non-jamb meshes: geometry/transforms/materials exact match | All |
| Side-facing middle rays that hit old opaque slab, then new glass | 108 / 108 |
| Side-facing perimeter rays that retain opaque jamb hits | 72 / 72 |
| Projected jambs within original glazing depth interval | All |

Each projected bay tests three side-return middle positions on each side, plus front/rear jamb positions on each side. Ray intersections use the complete bay meshes, including front glass and unchanged caps/mullion. Results are in `artifacts/projected-bay-side-frame/result.json`.

Implementation is confined to the side-frame loop in `src/building-model.ts`. The additional verifier is `scripts/verify-projected-bay-side-frames.mjs`. No browser, GPU or production build was run by this implementation agent. Root must review actual rendered same-camera Gugeun and Jinhyeon views before accepting visual fidelity.
