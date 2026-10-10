# Hakuijeong: bounded silhouette and eave improvement

2026-10-10. Priority follows the user's request that Hakuijeong currently looks too crude and that the final demonstration orbit and zoom around it. Graduate glazing stays OFF.

Reviewed actual `artifacts/north-haku-review-phase21-retry/hakuijeong-close.png` and `hakuijeong-corner.png`, source `references/research-20261010/panorama/photo/hak/hak02.jpg`, `hak03.jpg`, `hak05.jpg`, and `references/hakuijeong.jpg`. The last file is the small official facade/pond image, not a separately verified full-resolution official number-10 image. No claim to have inspected an unavailable full-resolution file.

## Visible problem and evidence

Current main roof reads as a straight pyramid with four bulky straight hips. Its separately bent perimeter produces angular triangular corner patches rather than the source's continuous sweep. The roof has dark, broad stripe shading. Timber rafter end dots dominate the edge; the source instead shows a distinct grey ceramic edge above natural timber rafters.

`hak05` is useful for complete silhouette: steep upper roof changes into a shallow lower sweep, and corners rise from the eave midpoint. `hak02/03` show the layered tile/wood edge, round tile end faces, natural wood lengthwise grain, broad head beams and a shallow shaped lower beam edge. They do not justify exact measured curvature, tile count, ornamental carving or timber species.

Sources are the existing official project at `http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/photo/hak/`. SHA-256: hak02 `5553a557277466b42a482a24d53f7d1a668c9c8daa22ff23f2a6c6bdb05f864a`; hak03 `fbb578b8d3694e7ef063e9401bb4e899d6a593aef08d154d348b16fc9da1f51b`; hak05 `5304e7339b1418bcd7968a1807178749a8e8d5827860e329d5f0d6c399e9d011`.

## Approximately 25-minute implementation scope

Use new `src/data/haku-roof-profile.ts` ONLY for `hakuijeong-pavilion`. Replace its generic pyramid plus rim with a single connected four-face roof formed by apex and four square rings. Preserve 4.4 m post footprint, eave horizontal extent, top datum 4.0 m, apex 5.7 m, finial, piers, deck, bridge, water and geographical centre. Existing `roof.eaves = 0.9` expands footprint vertices radially: outer half-width is **2.2 + 0.9 / sqrt(2) = 2.8364 m**, not 3.1 m. Do not silently enlarge it.

| Normalized square radius | Height / roof.height | Corner lift / roof.height |
| ---: | ---: | ---: |
| 0, apex | 1.00 | 0 |
| 0.28 | 0.52 | 0 |
| 0.58 | 0.18 | 0.025 |
| 0.82 | -0.01 | 0.11 |
| 1.00 | -0.070588 | 0.205882 |

At each ring side, parameter `s` runs −1 to +1. Use `y = top + roof.height * (height + cornerLift * s*s)`. This keeps outer midpoint at top −0.12 m and corners at top +0.23 m, while spreading the curve over the main roof rather than a separate lip. These numerical ring samples are an interpretation to trial, not a photogrammetric fit. Interpolate adjacent rings, use 24 segments around each side and smooth shared normals within each face. Preserve hard transitions at the four hips. Face UVs must remain continuous across radial rings; never restart the tile texture per band. Replace straight hip cylinders with connected short segments following ring corner heights, radius approximately 0.075 m, without spherical blobs at ring joints.

Keep every new roof face marked `userData.pavilionRoofSurface = true`. Existing underside sampler must read these replacement triangles so the rafters continue to stay beneath the real curved roof. Do not keep the old main roof or old rim hidden underneath; overlapping surfaces will cause flicker and erroneous underside samples. Recheck all original rafter cross-section clearance points because the middle roof is now lower.

Add one ceramic end row: approximately 24 plain shallow circular end caps per side, radius 0.072 m and depth 0.035 m, dark neutral grey. Seat them on the actual outer edge above the timber, face outward/down-slope and keep their front extents subordinate to the eave. A shallow plain cap is sufficient; actual flower/crest detail is not resolved well enough to recreate. Use low-contrast tile ribs at approximately 0.23 m pitch, with broad black alternating stripes reduced. Keep grey ceramic visually separate from brown wood. Do not add a second roof storey, speculative ridge animals or invented lettering.

If time remains after shape and edge are sound, increase the existing headbeam depth from 0.26 to around 0.32 m and give only its lower edge a shallow rounded relief: amplitude no more than 0.035 m and estimated pitch 0.18 m. Preserve post contacts and capbeam positions. This is a schematic shadow line based on source-visible relief, not a copied floral pattern or reconstructed hidden joinery. Shape changes outrank additional decoration.

## Wood and signboard boundaries

The old Wood096 colour trial was visibly grey compared with the warm natural timber source. Do not simply enable that diffuse material unchanged. A bounded option is to keep current warm wood base colours and use only subtle lengthwise luminance grain (about ±8–12%) from the already-available CC0 asset, with normal strength at most 0.06. Grain must follow each member's long axis, without plank seams or large repeating knots. This remains a stock appearance approximation, not an AKS material scan; approve only after same-camera actual comparison. Flat warm timber is preferable to an unreviewed gray diffuse takeover.

A photographed signboard is visible but runtime source-photo textures are currently excluded by `pavilionDetails.limits`. This contract leaves signboard image mapping out of the bounded geometry pass. Do not synthesize calligraphy or claim a blank/typed sign recreates the source. The user's improvement request permits reconsidering the old limit later, but any actual photo patch needs an explicit accurate crop/UV/source contract and visual review.

## Actual acceptance views

Root owns GPU/build. Render close, corner and a genuinely lower view revealing the underside. Compare to the Phase21 baseline and hak05/02/03. Required observations: smooth concave sweep, connected hips, grey ceramic edge above warm timber, no band seams or exposed triangular patches, no rafters crossing the roof, no frame/beam float, preserved deck/bridge/terrain geometry. Also check a short slow orbit, since cracks/flicker often appear only in motion. The new data is OFF until implemented and reviewed; this document does not claim improved rendered quality.
