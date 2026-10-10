# Graduate glazing: disabled limited appearance trial

2026-10-10. Original photograph and actual `artifacts/overnight-phase22-demand/facility-13.png` reviewed. The rendered south windows currently share a dark colour; the photograph clearly separates dark upper panes, blue lower reflections and green ground-floor blind appearances. A limited colour-only trial is feasible. No renderer change or adoption is made here.

Source: [official institute blog](https://m.blog.naver.com/aksblog/223408506698), original `references/research-20261010/high-resolution-search/target-223408506698-19.jpg`, 4032 × 3024. SHA-256 `3e7326c077e46ca4d4ae732a9ea95732cca52fd87f65d3f0205eb8445d1d7f55`. Original EXIF capture time is 2024-04-07 13:41:35. The original file is preserved. No new source downloaded.

`src/data/graduate-glazing.ts` contains all 17 original-pixel rectangles, pixel counts, measured encoded-sRGB means, candidate colours and estimated individual pane bounds. Every rectangle was visually inspected on a full-resolution crop with rectangle outlines. Rectangles lie within visible glass interiors and exclude frames, columns, external foliage and the foreground stone. Reflected trees remain present in several glass samples; only their mean colour is used. These samples do not support drawing a reflected tree pattern or blind slat count.

The candidate method matches the existing main-glazing approach: per-channel arithmetic mean in encoded sRGB, blended 80% with 20% arithmetic neutral grey, rounded to the nearest integer. These are photographic display-colour starting points, not measured physical albedo, linear-light averages, reconstructed reflection environments or calibrated exposure values.

## Exact trial scope

All locators use building `graduate-school`, part `graduate-main`, face `south`. Photo left is model west. Bay numbers are zero-based west-to-east indices in the existing 12-bay upper window layout. Mapping the photo's two clear eastern bays to indices 10 and 11 follows the existing photo-patch contract; total bay count and metric placement remain inferred behind trees.

| Layout | Centre east (m) | Sill (m) | Panes sampled |
| --- | ---: | ---: | --- |
| 0, bay 10 | 32.0625 | 4.7 | upper indices 0–1 and lower indices 0–3 |
| 0, bay 11 | 36.4875 | 4.7 | upper indices 0–1 and lower indices 0–3 |
| 1, bay 10 east narrow opening | 33.0625 | 0.9 | upper index 0 only |
| 1, bay 11 west narrow opening | 35.4875 | 0.9 | upper index 0 only |
| 1, bay 11 east narrow opening | 37.4875 | 0.9 | upper index 0 and lower indices 0–1 |

The ground-floor opening west of centre 33.0625 is tree-obscured and is excluded entirely. Lower panes at 33.0625 and 35.4875 are also excluded because columns/foreground stone obscure part of their extents. No samples apply outside these five explicitly listed openings. Do not extrapolate the green appearance to all ground-floor windows.

Upper-floor split height is 5.708 m (4.7 + 2.1 × 0.48); ground-floor split height is 1.782 m (0.9 + 2.1 × 0.42). `estimatedPaneBounds` gives full pane intervals in local east/height coordinates, before frame clearance. The recessed south wall is local north −10.8 m. Use approximately 0.045 m inset on each pane edge to preserve existing mullions; existing glass outward face is local facade z 0.21, frame outward face 0.27. These depth observations describe the current generator and are not surveyed building measurements. Implementation must avoid overlapping coplanar glass surfaces and preserve all frame geometry.

## Required review before adoption

Keep this trial OFF by default. Root/Sol may implement a scoped flag using these locators after the unrelated Unjung window issue is resolved. Compare actual near and oblique captures with the current baseline and source: check upper dark/lower blue separation, green ground panes, intact frames, no flicker or floating panes and no colours leaking into other bays. The present source review does not establish a rendered improvement. The existing single-pane photo texture trial must not be active over the same pane during this comparison.
