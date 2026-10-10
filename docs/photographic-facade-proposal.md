# Photographic facade UV proposal

Scope: original-photo projection onto selected 3D faces, without modifying the source raster. No app code, build, browser or generated image was used for this review. Coordinates below are manually proposed starting points, not calibrated survey control points. Check projected window alignment before adopting them.

## Three priority faces

| Priority | Original image / dimensions | Target part and plane | Usable evidence / main limitation |
|---|---|---|---|
| 1 | `references/itaekjae.jpg`, **966×644** | `itaekjae-main`, local **south**, north-coordinate `n=-11`, easting `[-15,15]`, body height `[0,14.6]` | Nearly frontal, bright upper three balcony rows, brick piers and floor bands. Lower floor is crossed by external black fences and vegetation; never project that obstruction onto the building. |
| 2 | `references/research-20261010/astra/ksde-jangseogak-design.jpg`, **3665×2425** | `jang-west-archive`, local **north**, `n=23`, easting `[-34,2]`, height `[0,13.8]` | Right-hand broad archive face: stone, horizontal dark bands and projecting fins. Do not include the left return plane or rooftop in one homography. A lamp in front is an obstruction, not facade detail. |
| 3 | same architect original | `jang-east-public-wing`, local **north**, `n=17`, easting `[12,56]`, height `[0,14.5]` | Long left block: recessed glass/window groups, framed stone, dark reflections. Tall columns stand in front on a different plane. Prefer individual glazing patches over one photographic billboard across columns. |

The architect photo was displayed at approximately1934×1280 during review; **that is a preview, not the source resolution**. The following JSG coordinates are converted to the original3665×2425 image and carry about±10–15px manual uncertainty.

## Corner proposals

All photo corners are **TL, TR, BR, BL**, origin at upper-left, pixels `(x,y)`. All target coordinates are building-local ENU `(easting,northing,height)` before the existing15.5° rotation. These correspondences are proposals; heights are not measured from the photo.

### 1. Itaekjae upper facade

Visible outer brick rectangle above the obstructed bottom storey:

```text
photo TL (186,200)   TR (758,201)
      BR (771,459)   BL (172,458)

target TL (-15,-11,14.6)  TR (15,-11,14.6)
       BR (15,-11,3.65)  BL (-15,-11,3.65)
```

This selects the roof-line brick head and three upper balcony rows. It excludes the black fence band beginning aroundy485. The photo wall edges near the lower corners are slightly softened by vegetation; allow approximately±3–5px. The mapping is sufficiently frontal for a first trial, but current model floor heights and photographed fascia positions will not necessarily register exactly. Verify at the four opening corners of each row before retaining it.

Clean reference window/opening rectangles for alignment, **not four views of hidden surfaces**:

- Upper-left balcony group approximately`(213,248),(325,249),(325,316),(211,315)`.
- Upper second group approximately`(355,250),(465,251),(466,317),(354,316)`.
- Third-row left group approximately`(201,388),(318,389),(318,459),(197,458)`.

`balconyStacks` already creates4bays,1.2m recesses, railings, slab fascias and door panels. A full opaque photographic overlay would close those recesses and duplicate railings. Recommended first implementation: keep the wall piers/fascias and balcony depth, project the photo only onto corresponding existing **back glazing** and selected coplanar brick surfaces. Do not stamp the photographed railing across the back glass and then also put a second generated railing in front. Either exclude that subregion with geometry boundaries or use the photograph only above the railing line. No alpha-painted/generated replacement image is required.

The upper crop does not prove the unseen side/back walls, nor the bottom storey behind the fence. Retain those as estimated materials.

### 2. Jangseogak archive north

Rightmost broad face, **excluding the return plane to its left**:

```text
photo TL (2591,1184)  TR (3252,1215)
      BR (3252,1573)  BL (2591,1590)

target TL (  2,23,13.8)  TR (-34,23,13.8)
       BR (-34,23, 0.8)  BL (  2,23, 0.8)
```

The low0.8m cutoff is a proposed crop registration, not a measured plinth height. It avoids most terrace/ground contact. Adjust against the visible horizontal bands and current mesh base before committing. The original image photo-left corresponds to the **east end** of this north-facing block: easting therefore **decreases** left-to-right. Mapping photo-left tolocal−34 would mirror the facade.

Stable region: upper stone strip and the central/right fin field. Obstruction: a lamp near the lower-left edge of the rectangle (approximatelyoriginalx2570, y1430–1630), plus foreground railing at the bottom. Do not place those onto the building. Use separate geometric material regions or trim the affected low-left strip out of the projected surface.

The fins are three-dimensional and cast baked shadows in the image. Applying this whole image behind newly deep fins creates doubled stripes/shadows. Keep fin geometry only when each fin front/back receives a compatible projected patch and the reference's shadow is accepted as baked illumination. A safer first trial is the **flat stone band above the fins**, followed by individual fin front strips; do not claim a single-plane texture supplies their depth. No window openings should be added to this archive face.

### 3. Jangseogak public north — recessed facade

Whole visible recess proposal, used only as a calibration envelope:

```text
photo TL (726,1171)   TR (2145,1230)
      BR (2145,1527)  BL (726,1533)

target TL (56,17,11.75)  TR (12,17,11.75)
       BR (12,17, 3.35)  BL (56,17, 3.35)
```

The top/bottom height assignment refers to the current `framedGlazing` span; source top includes stone above some windows, so this **must not be blindly used as final full-wall UV**. Target heights need registration against the actual upper/lower glazing edges. Use it to locate separate patches, then snap each photo patch to its corresponding existing opening. As with the archive north face, photo-left is local east/high easting.

The clearest useful first patch is the **upper two-opening group between the second and third tall visible columns from photo-left**, approximately:

```text
TL (1044,1207)  TR (1298,1219)
BR (1298,1368)  BL (1044,1361)
```

This includes two window openings and their dividing stone pier; it is not one uninterrupted glass pane. Split the receiver at the central pier. Match it to the corresponding east-side public-wing bay only after checking the current five-bay ordering: geometricbay0 is not guaranteed to mean photo-left. Current model north-facing columns have1.4m porch depth and start at3.1m; keep their geometry **in front** of the recessed glazing, not in the same textured plane.

Left trees obscure the extreme east end of this long facade. Foreground lights and terrace railings cross the lower strip. Those pixels cannot establish wall material or doors. Dark glass reflections are present in the real image and may be retained as captured appearance; they are not transparent views of reconstructed interior space.

## Main and Gugeun: defer full facade projection

- `references/administration.jpg` is only435×290. The useful facade is roughlyx44–391, y151–195: less than50vertical pixels for two storeys. Trees cover several window bays and the foreground landscaping touches the base. Whole-façade projection would bake trees onto the wall and yield insufficient close-view resolution. At most a small unobscured upper window/stone patch can supply reference color; it does not justify a detailed facade texture.
- `references/gugeun.jpg` is435×290. A large trunk crosses the center/right facade, branches cover roof/eaves, and a sculpted tree hides the left bays. The entry canopy projects forward, upper bay-window boxes are separate planes, and the upper/lower wall are differently recessed. A single four-corner homography is not physically appropriate. Keep modeled geometry; seek a clean source angle before a photographic full-face trial.

## UV implementation constraints

1. Preserve original JPEG bytes and URL/hash provenance. Bind the original source as the texture; place UVs on receiver geometry. Do not rectify/export a new raster or inpaint occlusions.
2. Solve a3×3 homography from target-plane coordinates to source pixels. If `(u,v,1)` represents target-plane coordinates, compute `(a,b,c)=H(u,v,1)` then texture coordinates`(a/c/W, 1−b/c/H)` for the chosen UV convention. Check texture`flipY` and GLTF export once; do not apply two vertical flips.
3. A normal two-triangle quad with four corner UVs is **not generally a projective homography** across its interior. For standard exported GLB UVs, subdivide the receiver plane and evaluateH at every vertex; use enough subdivisions to keep source reprojection error below about1pixel. Alternatively a shader can divide projective texture coordinates byq, but such a custom shader is not automatically preserved in ordinary GLB material export.
4. Recessed glass, projecting columns, balcony railings, canopy tops and return walls are different planes. OneH cannot rectify all of them. Use bounded submeshes and distinct mappings; never stretch a north-facing patch around an unseen side.
5. Avoid z-fighting with a small face-normal offset only if adding a receiver; prefer replacing the material on the existing face/submesh. Do not leave the old cyan window plane coplanar under the photograph.
6. Original photographs contain sunlight/shadows. A strongly lit PBR texture can double-darken them. Test a near-neutral material/lighting treatment at the actual selected view, preserving geometric shading on structural elements. Do not conclude realism from a front-only screenshot.

## Acceptance for the trial

One frontal and one oblique actual render must show correctly ordered windows, no mirrored source, no photographed tree/fence attached to the wall, no closed-over balcony recess, no duplicate railing/column, and no texture wrap onto unseen faces. Keep the source attribution and the partial photographic coverage explicit. This proposal authorizes no claim of photogrammetry or recovered hidden geometry.
