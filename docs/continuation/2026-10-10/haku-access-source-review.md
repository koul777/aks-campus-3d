# Haku short access: source review and bounded implementation brief

Reviewed 2026-10-10 by the research/design reviewer. Scope: replace the current long access slab with the photographed two stone treads and the immediate supported brick approach. No application code or browser/GPU session was changed by this review. Existing photo plaque and curved roof are to be retained.

## Evidence actually inspected

- [2024 entrance original, image 17](../../../references/research-20261010/next-reference-search/blog-223408506698-17.jpg), 4032 × 3024: inspected both fitted view and original-resolution pixels. [Official source post](https://blog.naver.com/aksblog/223408506698). Two distinct stone blocks/tread surfaces sit directly below the centered railing gap. The lower stone is a little wider than the upper. Brick paving reaches the lower stone. Grass/soil flanks the paving, and near-bank pale piers remain visible beside it. Water is visible behind/between the supports, rather than across a long approach span.
- [2024 pond-side original, image 16](../../../references/research-20261010/next-reference-search/blog-223408506698-16.jpg), 4032 × 3024: water-facing pale piers stand in front of the irregular masonry bank; land and the path continue behind/beside the pavilion. This constrains the bank/pier relationship, not an exact shoreline plan.
- [2026 access-context original, image 25](../../../references/research-20261010/next-reference-search/blog-224263386724-25.jpg), 4000 × 2252: the short two-tread arrangement remains, with brick approach on land and water around other sides. [Official source post](https://blog.naver.com/aksblog/224263386724). Trees obscure roof details but not the basic access arrangement.

Original URLs, SHA-256 hashes and retrieval metadata are preserved in [the download manifest](../../../references/research-20261010/next-reference-search/highres-download-manifest.json). See also [the previous evidence limits](../../overnight/2026-10-10/next-reference-requirements.md). No new browsing is needed to settle the visible short-access form. These sources contain no surveyed scale or complete level side section.

## Source proportions and implementation estimate

The lower stone appears approximately as wide as the access opening, or slightly wider; the upper stone is slightly narrower. Against the photographed entrance facade, the lower width reads around three tenths of that facade. This is an oblique visual proportion, not a rectified photogrammetric measurement. The immediate paved strip is visibly broader than the steps: roughly two to two-and-a-half step widths near the foot in image 17. Avoid making the brick strip a narrow continuation of a bridge.

With the existing estimated 4.4 m pavilion footprint and 1.25 m opening, the implementation proposal is coherent:

| Element | Bounded working value | Status |
|---|---:|---|
| Floor top | 1.65 m relative to existing model datum | Existing model, retained |
| Upper tread top | 1.47 m | Estimated to form a short rise below floor |
| Lower tread top | 1.28 m | Estimated |
| Brick paving top | 1.10 m | Estimated; must be shared by grade/path contact |
| Total external stone run | 0.70 m from east edge 2.20 to 2.90 | Estimated, consistent with compact source form |
| Lower tread width | 1.25 m | Estimated from current opening/source proportion |
| Upper tread width | Approximately 1.10–1.18 m | Estimated narrower visible block, if opening geometry admits |
| Immediate brick path width | Approximately 2.4–2.7 m | Estimated from source width relationship |

Two visible tread tops plus the timber floor imply three height transitions from paving to floor. Do not count the floor as one of the two stone treads. Do not claim that these working dimensions or equalized rises have been measured from the real building.

Keep the external stones centered on the current access opening and perpendicular to its facade. The old diagonal endpoint [8,1] is not evidence of a diagonal stone stair. A compact path can meet the steps squarely and join the broader approach farther landward. Use muted warm-gray granite-like stone and desaturated brown/tan brick with quiet joints; source lighting does not support bright white stairs or saturated red paving.

## Coupled geometry and terrain changes

The current `site.bridge` spans [2.2,0] to [8,1], about 5.89 m. Its 0.16 m slab is level at 1.65 m and its terminal abutment uses `bridgeLandingHeight`. The current Haku grade polygon starts at east 6.8 m and stays at 1.49 m. None of that old terminal contact proof establishes contact at a new stair foot near east 2.9 m.

Replace the access as one bounded assembly: stone treads, immediate brick surface, supported land/bank underneath, shoreline exclusion at that land, and a grade connection toward the existing landward path. A notch excluding east ≥ approximately 2.18 m across north ± approximately 2.4 m is a defensible working shoreline interpretation around the access facade; it is not a surveyed boundary. Avoid moving the whole water boundary or filling beneath the water-facing piers. A compact irregular masonry-facing bank gives the source-supported transition where land meets water; hidden foundation construction can remain schematic.

`gradePhotoSiteHeight` runs after `gradeShorelineHeight`. Its polygon can therefore accidentally raise an area that the water grading intentionally lowered. Restrict the full-height plateau to the landward area and blend outward without flooding the undercroft with soil. Terrain vertices at the current level 18/19 are roughly 1.9/0.95 m apart near this campus, so terrain interpolation alone cannot guarantee the contact of a 0.70 m stair. A small overlap with the supported bank/path mesh can conceal interpolation seams; do not solve this with a thick, visibly floating rectangular platform.

`pavilion-model.ts` currently derives its railing gap from `site.bridge.start`. Preserve that input or update its derivation to the new access start; deleting `bridge` without addressing this closes the opening. Ground sampling also follows the old bridge endpoint in `terrain.ts`; revise the sample contract if the site representation changes. Keep the plaque and roof paths independent of this correction.

## Render inspection and rejection cases

Inspect the real Cesium result from the entrance front, a low entrance corner and the pond side, with the active terrain fully settled. Recheck after moving away and returning, because the local terrain refinement changes with view distance.

- Exactly two readable stone tread tops and their separate front edges remain below the timber floor. Reject a single flat bridge, a ramp, a third external stone tread, or stone floating short of the floor edge.
- Brick paving meets the lower stone across its width; its underside is supported. Reject a water strip, black crack, soil protrusion through the treads or a thick exposed slab edge.
- Land reaches the access-side piers while the pond-side pale piers remain legible above water. Reject a filled pond under the whole pavilion, terrain covering timber supports or water showing through the brick surface.
- The immediate path reads broader than the stones, with restrained brick scale and nearby soil/grass. Reject huge paving tiles, a long stone runway or repeated large cubes presented as a bank.
- Preserve the existing photo plaque, curved roof silhouette, access gap, footprint and floor datum. This task does not establish their absolute survey accuracy.

Acceptance requires both geometric contact checks and actual rendered inspection. The present review validates the visible source interpretation and the bounded implementation proposal; it does not assert that an uninspected render has passed.

## Postimplementation review: first actual Cesium render

The reviewer inspected these saved actual renders from `artifacts/haku-short-access-review-20261010`: `hakuijeong-product.png`, `hakuijeong-plaque-front.png`, `hakuijeong-corner.png`, and `hakuijeong-underside.png`. The reviewer also read `src/haku-access-model.ts` and the implemented Haku site/grade data. The root reports six stable poses, zero errors/failures, 19 ready facilities and unchanged Haku ground datum 136.01937069948286; these are the root's runtime observations, not a second GPU run by this reviewer.

**Decision: accept the narrow stair correction; reject finished visual acceptance of the combined access and bank assembly pending a bounded bank correction. This is not a fidelity pass.**

The front/product and corner renders show two short, distinct stone tread tops in place of the long slab. The upper is narrower, the brick path is broader than the steps, and paving reaches the lower stone without an obvious water gap. The visible opening, plaque and curved roof remain. The water-side pale piers are still readable; there is no visible need to change the floor or site datum to fix this access.

The newly visible bank is the outstanding defect. In the product/front views, the broad flat olive polygon and its straight exposed perimeter read as an added raised platform. The path terminates inside that polygon rather than appearing to continue through planted land. In the corner and underside views, pale repeated faceted stones form a conspicuous necklace along its edge, with protrusions projecting away from the bank and clusters competing with the near pier. This does not resemble the darker, embedded irregular masonry behind distinct pale piers in source image 16, or the soil/grass shoulders adjoining the brick path in image 17. The treads themselves do not visibly float in these images; the objection is the artificial visible bank and stone treatment, not a demonstrated failure of the stair-foot contact.

Bounded corrective recommendation:

1. Keep the two tread elevations, compact run, path width and shared contact heights. Preserve existing roof/plaque and geographic datum.
2. Keep a hidden support volume beneath the stones and paving, but replace the broad exposed flat earth shoulder with a graded/tapered surface that reaches adjoining terrain. Hide the long straight landward extrusion edge. The existing bank extends to east 10 m while the path ends at east 8 m; the remaining landward zone should visually join the local grade, not become an isolated platform margin.
3. Give the visible shoulders muted soil/grass color variation compatible with adjacent ground. Shape and grade continuity matter more than adding fine texture to the current flat polygon.
4. Treat masonry as a compact facing embedded into the bank: flatten and sink its shapes, darken/desaturate it relative to the pale piers, reduce regular bead-like spacing, and preserve readable separation at the pier locations. Avoid an unsupported row of bright low-poly rocks offshore. These are visual corrections to an estimated bank, not claims of surveyed individual stones.
5. Repeat the front, corner and pond-side views after the bounded correction. Accept only when the steps remain distinct and connected, the water-side piers stay exposed, and the visible land no longer reads as a separate olive platform or floating rock chain.

This first render improves the source-supported access form substantially. Its bank treatment remains visibly schematic, and no overall architectural fidelity claim follows from runtime stability or the accepted tread count.

## Postimplementation review: refined bank and support

The reviewer subsequently inspected the actual `hakuijeong-plaque-front.png`, `hakuijeong-corner.png`, and `hakuijeong-underside.png` images in `artifacts/haku-short-access-refined-20261010`. This is a review of those saved pixels, not another browser/GPU run. The root reports all six refined poses stable with zero errors/failures; the broader facility regression was still underway when this review was recorded.

**Decision: accept the bounded short-access refinement.** The broad flat olive platform and conspicuous pale stone necklace identified in the first render are no longer visible. The two short stone treads remain independently readable below the floor and meet the wider brick path. The path now sits among the surrounding graded terrain rather than inside an exposed polygon platform. The near and pond-side pale piers remain clear, and the visible plaque, access opening and curved roof are retained. No obvious new stair-foot or paving support gap is visible in the three inspected views.

The remaining faceted ground shoulders, dark angular shoreline patches near the entrance-side pier, simplified vegetation/materials and approximate shore contour remain schematic. This limited refinement does not establish surveyed dimensions, detailed natural-bank reproduction or overall building fidelity. Those limitations do not justify another iteration on the now-corrected short-tread and immediate-path scope. The refined actual views resolve the specific visible platform/stone-chain rejection above; the first render verdict remains recorded as the history of the reviewed candidate, not the verdict on this refinement.
