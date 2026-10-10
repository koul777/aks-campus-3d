# Local shoreline grading — independent implementation review

Scope: read-only code review of `src/terrain.ts`, `src/terrain-grading.ts`, related model datum and scene transform. No build, browser or app edit. This is not final G2.

Reviewed hashes: terrain.ts `28C52006FA2BC8E118054CCC444FD5BCD354DD932EA7C2DB3DEDAB83F157B62B`; terrain-grading.ts `5F4C13BE409216349B2CEA222A6496E088EAFFDE454346E46C7998F4E92EAFE2`.

## Findings

1. **Retry defect — terrain.ts:25–28.** The memoized `waterLevels` promise stays rejected after one failed `getFacilityElevation`. Native tile-cache rejection removes its own entry, but subsequent intersecting terrain requests still receive the permanently rejected water-level promise. Reset this memo on rejection so a transient network/decode failure can recover.
2. **Datum/render sampling differ — terrain.ts:33–38 and elevationAt.** The displayed native grid bilinearly interpolates a rounded 65×65 subsampling of 256×256 DEM; facility datum uses nearest 256×256 pixel. Fresh original tile `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/13974/6354.png` decoded with RGB Terrarium formula gives 136.3515625m at `groundSampleOffset=[-7,-12]`, versus 136.94045787488545m from the display interpolator at the same point (0.588895m difference). Consequently model clearance is not necessarily its actual clearance above rendered native terrain. If changed, model and water must use the same datum function together.
3. **The south bank is raised, not excavated — terrain-grading.ts:66–70.** With current anchor `(127.0513,37.3933)`, rotation 15.5°, sample offset, 1m model clearance and 0.12m water offset, the water datum is 137.4715625m. At outline point `[0,-28]`, original display-interpolated terrain is 136.01937069948286m: 1.452192m below the water. The six-metre blend thus descends outward from a raised water edge. There is no mathematical hole, but the result can look like an elevated pool/berm. Validate actual side view before accepting; do not label it surveyed shore geometry.
4. **Foundation contact — building-model.ts pavilion stilts and grading depth.** Stilt bottoms start at model local0; deepest graded bed is local `0.12−0.45 = −0.33m`. Thus a stilt over sufficiently interior pool bed ends 0.33m above bed. Opaque water may hide the gap. This is a local geometry relationship, not a DEM precision issue.

## Checks that did not reveal a sign/continuity defect

- `localToGeographic` uses local east/north followed by +15.5° CCW rotation. This matches Scene.tsx `Rz(+rotationDegrees)` and the GLB Y-up to ENU convention used with Axis.Y/Axis.X. `geographicToLocal` is its algebraic inverse.
- Shoreline height is C0-continuous: inside and outside converge to water datum at distance0; outside smoothstep returns the original DEM at distance6m with zero blend derivative there. The shoreline itself changes slope (inside slope up to0.3m/m versus outside0), so it is not C1 everywhere.
- The fixed outline has no duplicate consecutive vertices; the segment-distance division has no zero denominator for current data. A future arbitrary polygon should guard duplicate points.
- Model water extrusion top is 0.025m above its supplied water elevation; grading targets the lower datum. This small separation is consistent with keeping the visible water above the bed, not an ENU sign error.
- Local patch lies well inside native tile14/13974/6354 (sample fractions0.2440,0.6814); no native tile14 seam crosses this pond. Native raster endpoint sampling can differ at neighboring tile boundaries in general, but that is not the local pond failure identified here.
- Geographic conversion uses spherical radius approximations rather than ellipsoid geodesics. Over this tens-of-metres patch its small discrepancy does not explain metre-scale water/terrain mismatch.

The important remaining evidence is actual oblique shoreline rendering after the recovery/datum decisions, including deck-to-bank and stilt-to-water relationships. Successful finite UV/GLB triangle checks do not establish these contacts.
