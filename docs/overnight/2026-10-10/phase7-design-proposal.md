# Phase 7 proposal — 이택재 balconies and underground parking entrance

Status: source review completed; root approved the data application after independently inspecting `artifacts/parking-satellite-review.png`. Data contracts below are now applied; renderer/terrain integration and rendered acceptance are pending. Numeric dimensions remain photo-proportioned estimates, not surveyed/as-built drawing dimensions.

## Approved application and height agreement

- Parking anchor is satellite pixel **(1033,817)**, longitude127.05495625/latitude37.39226875. In the existing 장서각 local frame this is [67.677,17.178] m. Rebased parking wall spans local E[−11.7,17.3], N[−0.5,0.1]; openings are centred at E5.2 and10.85 m on its south face. This preserves the interpreted retaining line instead of transplanting 장서각-frame coordinates directly into the parking frame.
- Parking `groundSampleOffset:[7.5,−8]` samples the lower forecourt. Root's terrain contract uses this estimated datum for the south approach (depth18 m), and datum+5.3 m for the northern upper-grade strip (depth5 m), with an approximately6 m transition to native DEM outside. No exact measured retaining step is claimed. The special-facility translation clearance is0 m so model wall and terrain grade share one datum.
- East Pond keeps its existing anchor/outline and gains `groundSampleOffset:[0,−5]`, an interior point away from the northern bank. The terrain implementation may combine this with low shoreline DEM samples to avoid raising water above the natural bank. This is an approximate model water datum, not a surveyed water elevation.
- 이택재's explicit `balconyStacks` replaces its generic `facadeStyle:'balcony'`; four glazing rows and only three upper railed rows are declared. Other-face `windowRows:4` remains, with renderer suppression required on the described south face.

## 이택재: four separate balcony stacks

Direct source: `references/itaekjae.jpg`, 966 × 644, official facility 12 photograph. Original: https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-12.jpg?v=241218 . Comparison: `artifacts/overnight-phase4/map-12.png`.

The photograph shows four vertical groups separated by substantial brick piers, with four glazing levels. The three upper levels have separate pale balcony fronts and fine vertical railings. The ground-level door/glazing band is partly screened by the sloping lawn and foreground site fence; a ground balcony railing is not confirmed. No continuous gallery slab or railing bridges the brick piers. Each broad glazed group has about four vertical panels, unlike the current small two-by-two windows. The top brick strip is noticeably taller than the inter-floor strip.

Suggested explicit part descriptor:

```ts
balconyStacks?: {
  side: CardinalSide;
  bays: number;
  openingWidth: number;
  openingHeight: number;
  recessDepth: number;
  floorHeights: number[];
  railedRows: number[];
  fasciaHeight: number;
  railHeight: number;
  doorPanels: number;
};
```

Photo-proportioned starting values on the existing 30 m wide body: south face, 4 bays, openingWidth 5.8 m, openingHeight 2.8 m, recessDepth 1.2 m, floorHeights [0.35,3.65,6.95,10.25], railedRows [1,2,3], fasciaHeight 0.55 m, railHeight 0.95 m, doorPanels 4. Bay centres remain evenly spaced at approximately −11.25,−3.75,3.75,11.25 m, leaving masonry between them and at the ends. The depth is particularly uncertain because the image is nearly frontal.

The renderer should recess only these openings: retain substantial brick piers and spandrels, set glazing behind the balcony front, and keep each slab/rail inside its own bay. A practical mesh decomposition is a shallow recessed front body plus opaque brick piers/spandrels restored to the original face plane. Do not move the roof footprint or turn the entire façade into an open veranda.

Existing conflicts to resolve when approved:

- `facadeStyle:'balcony'` currently makes four continuous width-wide slabs/rails. The new descriptor must take precedence and skip this generic branch.
- `windowRows:4` may remain for unverified other faces, but generic windows on the described south face must be skipped, just as for `windowLayouts`/`framedGlazing`.
- `facadeBays:4` is consistent, but the descriptor should be the authoritative count for this face.
- `wallSurface:'brick'` stays on the opaque body/piers, not on glazing, pale balcony fascia or railings.
- Do not add a second horizontal crossbar halfway up every glazed panel; the visible hierarchy is broad full-height panels and a separate front guardrail.

Acceptance view: a near-level frontal view, not only a steep roof view. Four separate pale stacks, four broad glazing levels and brick separations must remain visible; no horizontal slab may cross all four bays.

## Parking: retaining wall on the field edge, facing the lower south forecourt

Direct sources: `references/parking.jpg` (official 18), plus `references/research-20261010/panorama/jangseogak/face-r-3840.jpg` and `face-r-1024.jpg` from the official 2021 drone panorama. `face-d-3840.jpg` confirms road/gate/forecourt relations but does not show the portal itself clearly. Official photo: https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-18.jpg?v=241218 . Panorama: http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/jangseogak.xml . Comparison: `artifacts/overnight-phase4/map-18.png`.

The entrance is part of a continuous stone retaining wall along the south-east edge of the playing field. It connects toward the east side of 장서각 and runs toward the campus avenue. The wall faces the lower paved forecourt to the south, with the lawn/field and railing above and behind it to the north. Two dark in/out openings sit toward the road/right end of that wall; the long section toward 장서각 is mostly solid stone, with smaller ventilation windows visible farther left. A separate free-standing portal on a narrow paving strip does not reproduce this.

Coordinate interpretation, pending independent plan check:

- Existing parking anchor is satellite pixel (1040,849). In the current 장서각 rotated local frame this is approximately [65,−5] m.
- The photographed retaining line should be near the public wing's north-east corner, approximately N=+17 m in that same current model frame, and extend east toward the avenue. Thus the current portal appears roughly 20–25 m too far south, independent of the height problem.
- Initial wall-line proposal in the **장서각 frame**, not a new surveyed location: E≈56..85 m, N≈17 m. Entrance pair toward E≈76 m. These values derive from the current OSM-guided building corner and the aerial relation; the east endpoint/portal centre require checking against the actual satellite road margin before data application.
- Keeping the existing parking anchor temporarily, the same line would be roughly local E≈−9..20 m, N≈22 m. This demonstrates the required relationship without silently moving a georeferenced anchor. Once the line is independently verified, choose the portal centre as the parking facility anchor and rebase all local parts consistently.

Proposed explicit descriptor, preferably part-level so the generic underground-parking special case does not duplicate it:

```ts
retainingEntrance?: {
  side: CardinalSide;       // south, toward the lower paved forecourt
  wallSpan: [number,number];
  wallHeight: number;
  wallDepth: number;
  openings: {center:number;width:number;height:number}[];
  upperGradeDepth: number;
  approachDepth: number;
};
```

Photo-proportioned starting scale: continuous wall about 29 m long and 5.0–5.5 m high, two openings about 5 m wide and 3.3 m high with a narrow central pier. Use wallDepth≈0.6 m, upperGradeDepth≈5 m, approachDepth≈18 m only as a local visible composition. Exact soil/retaining cross section is unknown. There must be no above-ground “parking building” volume behind the wall; the upper surface represents adjacent planted/field grade. The dark openings can remain shallow recesses, without invented interior geometry.

Height contract must be explicit: sample the lower forecourt for the portal base, preserve wall-top continuity with the playing-field grade, and use only a bounded local terrain adjustment if the coarse DEM cannot resolve this retaining step. Do not raise the complete campus or apply a floating grass slab. The roof/top planting band and a thin upper safety railing can indicate the raised grade; arbitrary trees are unnecessary.

Acceptance views: south/forecourt façade showing two openings within one continuous wall, plus an oblique side view showing connection to field grade and 장서각. Camera, wall facing and terrain datum must agree before façade ornament is assessed.
