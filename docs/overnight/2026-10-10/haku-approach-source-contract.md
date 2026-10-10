# Haku entrance steps: bounded source contract

2026-10-10, read-only Astra follow-up. No source changes or GPU rendering. This supplements the frozen independent review; it does not replace its scores.

**The original images support a short pale-stone stair at the access gap and a nearby shore landing. They do not support the present long elevated slab bridge. A short stair is safe to prototype, but replacing the full span as a default is conditional on actual terrain-contact verification.** Do not reconstruct an entire bank or move the pavilion to force a match.

## Directly visible evidence

Sources are original `hak01.jpg` through `hak06.jpg`, preserved under `.assay/overnight-realism-20261010/target-final-27/reference/research-20261010__panorama__photo__hak__`.

- `hak02.jpg`: the access gap is between the two front timber rail panels. Two pale stone tread surfaces are visible immediately below the timber threshold; the lower image edge limits complete ground visibility. There is no long timber approach deck in that near-entry view.
- `hak03.jpg`: the same entrance is visible obliquely from the water side. A short stepped stone block sits directly below the opening and meets the landward paving. The landward edge is close to the pavilion; water-facing white piers descend into the pond. This is the best stair/ground relation image.
- `hak05.jpg` and `hak06.jpg`: the pavilion straddles the immediate shoreline. The stone-edged shore reaches the landward posts. These images establish adjacency, not surveyed bank geometry or cardinal direction. They do not justify a long raised bridge crossing an open strip of water or terrain.
- `hak01.jpg` is primarily plaque/beam evidence. `hak04.jpg` is neighboring grounds evidence; neither establishes stair dimensions.

The source justifies a compact entry stair, a pale stone appearance and shore adjacency. Exact tread count beyond the clearly visible two, riser height, width, plan length, stone joint pattern, hidden footing and geographic entry azimuth remain estimates.

## Existing implementation and contact limit

`src/data/geographic-buildings.ts:413` gives the current approach:

```
start = [2.2, 0]
end = [8, 1]
width = 1.25
elevation = 1.65
```

Its plan length is approximately 5.885 m, greater than the pavilion's 4.4 m side. `src/building-model.ts:2769` makes one level slab 0.16 m thick along the complete length. The pavilion platform top is also 1.65 m; the railing gap already derives from the bridge start. These contact points should remain stable.

The phase27 GLB confirms the slab spans approximately x 2.094…8.106 with top y 1.65. Its terminal support is y 1.41…1.49. The generator falls back to `ground = elevation - 0.16` when `bridgeLandingHeight` is unavailable. **Correction: this fallback deliberately matches an explicit photo-estimated terrain grade in `src/data/site-grading.ts`; the absence of a `bridgeLandingHeight` assignment does not establish a detached or unverified current endpoint.** The Haku patch has outline `[[6.8,-1.2],[11,-0.5],[11,3.5],[6.8,3]]`, height 1.49 and min/max levels 18/19. The root's reported public `globe.getHeight` checks at the existing endpoint centre and edges returned 1.4880…1.4885, against the slab bottom 1.49: about 1.5–2 mm residual in this estimated model grid. I did not rerun those checks. This supports contact with the explicit modeled grade; it is not a physical survey or proof that the real shoreline has those coordinates and levels.

The pavilion detail contract also lists “existing bridge position and level” among preserved properties. Any approach redesign should explicitly revise only that estimated approach contract, while preserving the confirmed pavilion, water and terrain datums. It must not silently change those datums or the building anchor.

## Bounded prototype contract

Use the existing entrance gap center and its outward direction. Preserve the pavilion anchor, rotation, 4.4 m footprint, existing posts and white piers, platform top 1.65, roof geometry, water outline/elevation and terrain data. Keep the entry gap and nominal 1.25 m approach width; do not introduce an unsupported new rail or a new entrance face.

Prototype a compact pale-grey stone stair immediately outside the gap, with **two visible treads** and the timber platform serving as the upper threshold. A first modelling estimate is a total horizontal stair run of 0.70–0.90 m and 0.18–0.22 m per drop (total 0.36–0.44 m). The nominal lower landing would thus be y 1.21–1.29 if the top is fixed at 1.65. These numbers are proposed construction estimates, not measurements from the photographs.

Allow a plain near-entry landing only where the existing terrain permits it, no longer than approximately 0.60–0.80 m beyond the stair, at the same width or only slightly wider. Keep the complete local addition within roughly 1.7 m of the gap. Do not make an ornamental stone bank, artificial island, shoreline wall or buried fill wedge to disguise an unknown contact. Do not retain a second full-height slab through the new stairs.

**Terrain-contact acceptance is mandatory:** sample the unchanged existing terrain at the proposed bottom landing and inspect a low side render. If that ground cannot meet the short stair without a gap, burial, implausible risers or a new unsupported bank, reject the default replacement and retain it as an opt-in prototype. Do not increase the risers or alter the terrain/water/pavilion height until they meet merely to force the proposed form.

The remaining old 5.9 m span cannot be confidently replaced with a path or ground apron from these sources alone. The existing endpoint's contact with its explicit grade is supported, but a new short landing near the pavilion lies outside that patch. Shortening therefore requires a separately justified patch/shore relation and actual terrain-contact measurements at the new endpoint. It must not inherit the old endpoint's evidence. Source-faithful local steps do not by themselves solve that larger site discrepancy.

## Required actual visual acceptance

Compare the new low three-quarter entrance view against `hak02`/`hak03`, plus the existing product view and a water-side view against `hak05`/`hak06`. Accept only when:

1. The two short pale treads visibly connect the existing gap/threshold to ground.
2. Neither posts nor piers nor water/roof/anchor move.
3. There is no retained full-height slab intersecting the stair, no floating bottom, and no terrain covering the treads.
4. No continuous bank reconstruction is implied by newly invented rock walls or fill.

A small opt-in step mesh should be feasible within a short implementation window. A default replacement is **not yet justified** because contact at the proposed shortened landing is unverified, while the current endpoint already matches an explicit estimated grade. Keep this as a next-phase contract unless source-supported shore/patch placement and terrain probes at the new landing are available, followed by an actual low-angle render. An attractive front screenshot alone cannot establish the new connection. The source discrepancy remains the long level slab versus the photographed short stone steps, not demonstrated detachment at the existing endpoint.
