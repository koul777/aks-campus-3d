# Graduate open entry canopy trial

2026-10-10. Opt-in only; rendered A/B acceptance remains pending.

Enable `?graduateEntry=open`. `BuildModelOptions.graduateEntry: 'open'` is gated by both `building.id === 'graduate-school'` and `part.id === 'graduate-entry-roof'`. Omitted options preserve default construction. There is no global colonnade change.

## Evidence and original geometry

Visually inspected `references/graduate-school.jpg`, showing a dark open doorway behind a tiled canopy and pale supports, and `references/research-20261010/high-resolution-search/target-223408506698-19.jpg`, showing the open approach and partially visible entrance in the 2024 photo. These support an open canopy, not a newly measured location, support shape or texture.

Current source `graduate-entry-roof` is E `[2,13]`, N `[-16,-11]`, base H 0, height 3.1 m, gable roof rise 1.2 m, porchDepth 2 m. Existing `bodyFootprint` recedes the south edge to N -14, producing a solid body E `[2,13]`, N `[-14,-11]`, H `[0,3.1]`. Generic colonnade decoration adds a beam centred at H 5.25 m, above the canopy roof apex datum H 4.3 m.

Canopy centre E 7.5 m and the existing main doorway centre E 12.15 m remain unchanged. Their alignment is not proven by this work, and the trial does not reposition either.

## Bounded implementation

A dedicated `addGraduateOpenEntryTrial` helper calls the unchanged `addRoof`, preserves the existing porch floor slab and immediately-below-roof ceiling/soffit slab exactly, and reproduces the four existing explicit support boxes exactly. It bypasses the canopy's solid body, automatic windows, generic façade/colonnade decorations and body foundation skirt. It adds no new shape, texture or material.

| Retained element | Unchanged geometry |
| --- | --- |
| Roof | Original footprint, eaves, surface/rim/fascia/ridge generation, height, UVs and materials |
| Porch floor | E `[2,13]`, N `[-15.9,-12.9]`, H `[0.455,0.805]`, colour `#b3b1a5` |
| Existing ceiling/soffit | E `[2,13]`, N `[-15.85,-13.15]`, H `[2.78,3.1]`, colour `#bcbcaf` |
| Explicit supports | Four existing 0.52 m square sections, H `[0,3.1]`, existing E positions and N -16.5, colour `#eee9dc` |

The photo shows round supports, but their exact dimensions and relation to all four current supports are not established. This narrow correction retains the current supports; their cross section remains a separate fidelity limitation. The soffit uses the existing 0.32 m ceiling slab without adding a new thickness or extent.

## CPU verification

Passed `node scripts/verify-graduate-open-entry.mjs` and `npx tsc --noEmit`. Results: `artifacts/graduate-open-entry/result.json`.

The verifier executes actual `createBuildingGlb` construction, cut immediately before geometry merging/export so the CPU group can be inspected. It uses current source functions, descriptors and roof UV helper. Browser canvas drawing is mocked solely for procedural material textures; no GPU or production build is used.

- Canopy meshes: 54 baseline → 14 open trial.
- Every retained mesh exactly matches a baseline mesh in geometry attributes/index, transform, colour, scalar material values and map/normal presence.
- All roof meshes match exactly; floor, existing soffit and all four supports are retained.
- Solid cladding body and generic beam at H 5.25 m are absent.
- Nine under-canopy approach rays at E 6/7.5/9 and H 1.2/1.8/2.4 hit the default body and pass unobstructed through the trial.
- `graduate-main` and `graduate-west-annex` match the default construction exactly.
- Tests using the same canopy descriptor with another building ID or another part ID prove both scope guards leave default geometry unchanged.

Changed only model option/helper/part-specific dispatch in `src/building-model.ts`, the `graduateEntry=open` query in `src/Scene.tsx`, and the additional verifier `scripts/verify-graduate-open-entry.mjs`. No building data, camera/focus code, source assets or dist output were changed for this task. Root must inspect actual same-camera default/open renders before adopting the trial; no visual acceptance or runtime claim is made by this CPU audit.
