# Unjung Phase24: window disappearance explained by gallery structure

2026-10-10. Actual `artifacts/defect-review-phase24/unjung-product.png` and `unjung-side.png` reviewed. This is a diagnosis of the unresolved visual result, **not a retroactive pass of the Phase24 window fix**. No source files changed for this analysis.

The open-frame and 0.18 m outward glass change does not address the observed side-view occlusion. Camera-to-glass rays physically cross the opaque gallery parapet and roof slab/fascia. The product view has a shallower local sightline and consequently exposes more of the same glass.

## Actual camera conversion

Input is `artifacts/defect-review-phase24/runtime.json`, views `unjung/product` and `unjung/side`. Convert recorded longitude/latitude radians and ellipsoidal height to WGS84 ECEF. Subtract Unjung anchor ECEF at longitude 127.0526401833°, latitude 37.395021175°, height 157.1796875 + 1.0 m (recorded groundHeight plus groundClearance). Project into anchor ENU, rotate −15.5° around up, then map to Three local `(x=east, y=up, z=−north)`.

| Actual camera | Local x | Local y | Local z |
| --- | ---: | ---: | ---: |
| Product | approximately 0 | 43.0839 | 86.6250 |
| Side | 55.6670 | 52.6900 | 66.3414 |

These values use the actual post-navigation state, rather than assuming requested heading/pitch/range survived terrain collision handling. Side heading is 5.3145361118 rad and pitch −0.5236123405 rad; product heading 6.0126620397 rad and pitch −0.4363459111 rad.

## Current local geometry

Recessed building body south face is z=23.5. Window assembly moved outward 0.18 m; glass box half-depth is 0.095 m, so its outward face is z=23.775. Lower and upper glass centres are y=3.0 and 6.4, with interior height 1.44 m. Opaque front structures are:

| Occluder | y interval | z interval | x interval |
| --- | --- | --- | --- |
| Gallery parapet | 4.10 to 5.20 | 25.01 to 25.23 | −25.5 to 27 |
| Intermediate slab | 5.13 to 5.37 | 23.40 to 25.70 | −25.5 to 27 |
| Roof slab | 7.88 to 8.20 | 23.45 to 25.65 | −25.5 to 27 |

The generic roof fascia is an additional solid expanded-footprint extrusion at y=7.72 to 8.02. Its south extent is about z=25.665, using radial 1.6 m corner expansion of a 52.5 × 24 m rectangle. It is not merely a narrow surface behind the glass.

For a diagnostic window-centre ray at `(x=3.375,y=3,z=23.775)`, the side-camera ray reaches z=25.12 at y=4.5701, inside the parapet. The corresponding upper-centre ray from y=6.4 reaches y=7.8627 and immediately enters the roof slab. This x coordinate is a representative ray coordinate, not an instantiated central window (the entrance suppresses central bays); the same y/z intersection applies to actual windows because each named obstruction spans the facade.

## Sampled physical intersections

Sample an actual non-central bay at x centre −12.375, using 21 positions across x ±1.32 and 101 positions across each glass centre y ±0.72. For each point `p`, intersect segment `p + t(camera−p)`, t in [0,1], with each named box using the standard per-axis slab interval intersection. No rendering, opacity heuristic or pixel classification is used.

| View / glass row | Rays hitting parapet | Rays hitting intermediate slab | Rays hitting roof slab | Rays avoiding these three boxes |
| --- | ---: | ---: | ---: | ---: |
| Side / lower | 93.1% | 58.4% | 0% | 6.9% |
| Side / upper | 0% | 0% | 90.1% | 9.9% |
| Product / lower | 37.6% | 0% | 0% | 62.4% |
| Product / upper | 0% | 0% | 22.8% | 77.2% |

The named occluders can block the same ray, so their percentages must not be added. The last column is only an upper bound on visible glass: the additional roof fascia, columns, window rails and other pieces were excluded from this simple named-box count. In particular, the fascia can cover the remaining side upper slice. This reproduces the actual side image's thin lower slit and blank upper windows without invoking unstable tiles, z-fighting, backface normals or failed material loading.

## Next evidence step

Preserve source-backed opaque gallery structure. Do not move the glass out in front of the gallery or remove its parapet merely to make elevated windows visible. Capture an additional source-comparable oblique view at heading around −55.5°, requested pitch approximately −12° to −15°, range approximately 100 m. Record the **actual** camera after terrain handling; if terrain prevents that pose, find another safe view with a similarly shallow local sightline.

Compare this additional view to the official gallery source and verify that the glass appears below the parapet sightline and below roof fascia. Keep the original Phase24 high side view and its failed visual expectation in the record. A new lower view can establish correct window placement under an unobstructed sightline; it does not mean the old image suddenly passed or that every possible camera should see recessed windows. No new lower-pose result was available when this proof was written.
