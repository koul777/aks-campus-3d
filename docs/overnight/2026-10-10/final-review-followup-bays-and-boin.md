# Follow-up diagnosis: projected bays and Boin camera

2026-10-10. Read-only follow-up after the independent review was frozen. The earlier `final-independent-review.md` is unchanged. This follow-up may read product source and the specifically relevant historical render artifacts. No source edits, new browser session or GPU render were made.

## Corrected conclusion on Gugeun and Jinhyeon

**The projecting bays are present in the actual phase27 GLBs, correctly placed on the modeled entrance face. They are not absent.** The frozen review's front-view wording should not be used to claim missing projection geometry. The high, nearly straight-on product pose suppresses its visual depth. An additional, concrete geometry problem does obscure the side glazing: the opaque full-depth side jamb boxes cover the modeled side panes.

The requested `artifacts/defect-review-phase23/gugeun-*.png` and `jinhyeon-*.png` do not exist. That directory contains main, graduate-school and Unjung views. I found and inspected the relevant actual views at:

- `artifacts/north-haku-review-phase21-retry/gugeun-side.png` and `gugeun-product.png`
- `artifacts/north-haku-review-phase21-retry/jinhyeon-side.png` and `jinhyeon-product.png`
- `artifacts/overnight-phase27-final/map-03.png` and `map-06.png`

The side images visibly show white projecting upper boxes on Gugeun and projecting boxes on both Jinhyeon storeys. Their full-image GLB hashes differ from phase27, so I did not assume equivalence. I decoded the GLB JSON/BIN directly using Python's standard library and compared the POSITION buffers for the bay glass, surrounds and mullions (materials 9, 10 and 11). All three buffers are byte-identical between phase21-retry and phase27 for each building. No rendering was needed for that check.

| Geometry evidence | Gugeun | Jinhyeon |
|---|---|---|
| Wall/front local plane | z = 11 | z = 10 |
| Glass POSITION extent in phase27 | z = 11.0525…11.5775 | z = 10.15…10.5775 |
| Surround POSITION outer extent | z = 11.63 | z = 10.63 |
| Glass POSITION SHA-256, equal in both GLBs | `6f79bd53ad37c62d0d2d8e0790aefd41c9c3d027456fff5e71ade9792ca9eae7` | `606123123014aee0658832e75a40350296f0ef442c4840bddc5a6876154708b4` |
| Surround POSITION SHA-256, equal in both GLBs | `1cc2eeb6bb2ab8b69f3035841a26bf8e003a2dee1213890ede7cf4c9b338d318` | `b561273b5e46c8bd0f9a7f836a64d96edfeb8e88d4d86b936f40f4ce66685a6a` |

In `src/data/geographic-buildings.ts:236` Gugeun has projected upper openings and flatter lower openings. At line 254 Jinhyeon has projected openings on both levels. Both use side `south`, projection depth 0.55, side pane width 0.40 and frame width 0.10. The modeled Gugeun upper and Jinhyeon bays are 1.65 wide × 2.25 high. The phase21 side images corroborate the entrance-face assignment; neither a missing generator invocation nor an opposite-face placement explains the appearance.

## Side-glass occlusion, derived from the actual generator

`src/building-model.ts:1842` onward creates each projected bay's front pane at local depth 0.55 and its side panes at x = ±0.825, with a 0.055 thickness. A side pane spans depth 0.15…0.55. The right pane's outer surface is therefore x = 0.8525.

The opaque right frame is centered at x = 0.865, has width 0.10, and extends over depth −0.04…0.59. Its x extent is 0.815…0.915. Its height also fully covers the glass. Thus the full-depth opaque jamb lies outside and around the right side pane; the left side is symmetric. The exposed side of the bay reads as a solid white slab, not side glass. The front pane remains visible. This is why “there is a sidePane mesh” is insufficient verification.

The original images show visible side glazing with white perimeter members: `reference/research-20261010__foliage-source__facility-review__gugeun-detail.jpg` and `...__jinhyeon.jpg` in the frozen snapshot. They support an open side-glass region, not an exact measured depth.

**Recommended limited correction:** replace each full-depth opaque side slab with narrow front/rear vertical frame members and retain top/bottom perimeter pieces so the existing side pane is exposed. Verify from a low three-quarter view on the same entrance side. Keep the current 0.55 depth pending stronger dimensional evidence. Do not enlarge it merely to make the frontal overview look more three-dimensional.

Classification:

- Missing projection: **no**, contradicted by GLB and oblique pixels.
- Wrong entrance-face assignment: **no evidence** in these views.
- Side pane occluded by opaque geometry: **yes**, supported by generator extents and side-view appearance.
- Projection too shallow relative to the real building: **unverified**; photographs lack a scale calibration.
- Front/high camera hides depth: **yes**, the paired product/side images demonstrate this.

The selected-view legibility concern remains, but the earlier inference of absence is corrected. This follow-up does not rescore the frozen target or establish a formal gate result.

## Boin camera diagnosis and a useful starting pose

The phase27 selection uses `boin.focusSide = 'east'` (`src/data/geographic-buildings.ts:359`). The focus calculation in `src/Scene.tsx:922` takes only the cross-face footprint span for distance: local north extent −23…16 gives 39 m, so the desktop nominal horizontal offset is about 64.35 m. Yet the building extends 62 m in the viewing-depth direction (local east −31…31). The near block is roughly 31 m closer than the target anchor. This explains why its blank east face and roof become disproportionately large and clip the selected view even while the target remains centered.

The actual `artifacts/boin-view-phase14/north.png` is a useful direction reference: it shows both principal blocks and the low connector/roof between them. It is an older model and must not be treated as proof of the current facade. Its `east.png`, and especially phase27 `map-14.png`, demonstrate why a straight east view hides the composition. The preserved 2024 sources (`blog-20240711_132106.jpg`, `blog-20240731_153340.jpg`, `boinjae.jpg`) justify showing both blocks and the low connecting volume in context. They do not verify a geographic capture azimuth.

**Suggested starting pose for a new render:** view from local north, then 15–25° toward local east. This should preserve the two-block separation visible from north while giving some view of the east corner glazing. Treat that as a composition proposal, not a source-verified compass heading. Use the full model bounds/diagonal (~73 m footprint diagonal; runtime sphere radius ~38.1 m), not just the 39 m cross-face span, to fit the camera. A horizontal offset of approximately 100–120 m with a 20–30° downward pitch is a reasonable first trial; derive the final distance from projected bounds and actual viewport aspect, with at least 10% margins.

Check the current GLB silhouette after terrain collision adjustment, not only the initial camera request. Verify that both main blocks, connector gap/roof, near ground and all roof edges remain on screen at desktop and 375 px. The current geometry places some connector glazing on its west face adjacent to the west block, so no untested pose can be promised to reveal all glazing at once. Prefer a useful whole-building starting view and a secondary corner/entry view over forcing every feature into one camera.

No evidence supports changing Boin's model orientation or geographic position merely to imitate a photograph's unverified capture direction.
