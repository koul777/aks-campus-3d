/** Disabled limited photographic display-colour trial. Not physical glass albedo. */
export type GraduateGlazingSample = {
  id: string;
  buildingId: 'graduate-school';
  partId: 'graduate-main';
  side: 'south';
  /** Estimated bay index, west to east, zero based. */
  bayIndex: 10 | 11;
  layoutIndex: 0 | 1;
  center: number;
  sill: number;
  paneBand: 'upper' | 'lower';
  /** Zero based, west to east within this band. */
  paneIndex: number;
  paneCount: number;
  /** Full estimated pane extent [eastMin,eastMax,heightMin,heightMax], metres; trim inside frames. */
  estimatedPaneBounds: [number, number, number, number];
  /** Original source pixels [left,top,rightExclusive,bottomExclusive]. */
  sourcePixelRect: [number, number, number, number];
  pixelCount: number;
  meanSrgb255: [number, number, number];
  classification: string;
  candidateSrgb: string;
};

export const graduateGlazingSource = {
  status: 'trial-requires-near-and-oblique-review',
  enabledByDefault: false,
  url: 'https://m.blog.naver.com/aksblog/223408506698',
  file: 'references/research-20261010/high-resolution-search/target-223408506698-19.jpg',
  sha256: '3e7326c077e46ca4d4ae732a9ea95732cca52fd87f65d3f0205eb8445d1d7f55',
  width: 4032,
  height: 3024,
  date: '2024-04-07',
  dateBasis: 'Original EXIF DateTimeOriginal 2024:04:07 13:41:35',
  candidateMethod: 'Encoded sRGB channel mean blended 80% with 20% arithmetic channel-neutral grey, rounded to integer channels. No exposure compensation. Display-colour proxy only, not linear or physical albedo.',
  application: 'Only the 17 explicit pane locators in graduate-main south windowLayouts. Keep trial OFF until actual near and oblique comparison. Preserve frame/mullion geometry and other glazing. Do not replicate to other bays, add blind slats or paint reflected trees. Locators and metric bounds are estimates, not a survey.',
  wallNorth: -10.8,
  recommendedPaneInsetMetres: 0.045,
  audit: 'docs/overnight/2026-10-10/graduate-glazing-source-contract.md',
} as const;

export const graduateGlazingSamples: GraduateGlazingSample[] = [
  {"id":"graduate-bay10-layout0-center32.0625-upper-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":0,"center":32.0625,"sill":4.7,"paneBand":"upper","paneIndex":0,"paneCount":2,"estimatedPaneBounds":[30.2125,32.0625,5.708,6.8],"sourcePixelRect":[1880,1305,1970,1340],"pixelCount":3150,"meanSrgb255":[38.297,40.826,41.934],"classification":"dark-interior","candidateSrgb":"#27292a"},
  {"id":"graduate-bay10-layout0-center32.0625-upper-1","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":0,"center":32.0625,"sill":4.7,"paneBand":"upper","paneIndex":1,"paneCount":2,"estimatedPaneBounds":[32.0625,33.9125,5.708,6.8],"sourcePixelRect":[2030,1290,2150,1330],"pixelCount":4800,"meanSrgb255":[36.947,39.134,39.612],"classification":"dark-interior","candidateSrgb":"#252727"},
  {"id":"graduate-bay10-layout0-center32.0625-lower-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":0,"center":32.0625,"sill":4.7,"paneBand":"lower","paneIndex":0,"paneCount":4,"estimatedPaneBounds":[30.2125,31.1375,4.7,5.708],"sourcePixelRect":[1825,1400,1885,1440],"pixelCount":2400,"meanSrgb255":[38.102,36.829,37.723],"classification":"dark-interior","candidateSrgb":"#262526"},
  {"id":"graduate-bay10-layout0-center32.0625-lower-1","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":0,"center":32.0625,"sill":4.7,"paneBand":"lower","paneIndex":1,"paneCount":4,"estimatedPaneBounds":[31.1375,32.0625,4.7,5.708],"sourcePixelRect":[1950,1391,1975,1426],"pixelCount":875,"meanSrgb255":[100.509,158.783,191.401],"classification":"mixed-reflection","candidateSrgb":"#6e9db7"},
  {"id":"graduate-bay10-layout0-center32.0625-lower-2","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":0,"center":32.0625,"sill":4.7,"paneBand":"lower","paneIndex":2,"paneCount":4,"estimatedPaneBounds":[32.0625,32.9875,4.7,5.708],"sourcePixelRect":[2025,1380,2090,1425],"pixelCount":2925,"meanSrgb255":[92.665,152.721,188.507],"classification":"blue-reflection","candidateSrgb":"#6797b4"},
  {"id":"graduate-bay10-layout0-center32.0625-lower-3","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":0,"center":32.0625,"sill":4.7,"paneBand":"lower","paneIndex":3,"paneCount":4,"estimatedPaneBounds":[32.9875,33.9125,4.7,5.708],"sourcePixelRect":[2130,1385,2150,1415],"pixelCount":600,"meanSrgb255":[44.763,51.79,57.033],"classification":"mixed-reflection","candidateSrgb":"#2e3438"},
  {"id":"graduate-bay11-layout0-center36.4875-upper-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":0,"center":36.4875,"sill":4.7,"paneBand":"upper","paneIndex":0,"paneCount":2,"estimatedPaneBounds":[34.6375,36.4875,5.708,6.8],"sourcePixelRect":[2340,1245,2510,1295],"pixelCount":8500,"meanSrgb255":[51.87,62.87,55.111],"classification":"dark-green-blind-appearance","candidateSrgb":"#353e37"},
  {"id":"graduate-bay11-layout0-center36.4875-upper-1","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":0,"center":36.4875,"sill":4.7,"paneBand":"upper","paneIndex":1,"paneCount":2,"estimatedPaneBounds":[36.4875,38.3375,5.708,6.8],"sourcePixelRect":[2600,1200,2790,1260],"pixelCount":11400,"meanSrgb255":[41.509,49.378,44.354],"classification":"dark-green-blind-appearance","candidateSrgb":"#2a312c"},
  {"id":"graduate-bay11-layout0-center36.4875-lower-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":0,"center":36.4875,"sill":4.7,"paneBand":"lower","paneIndex":0,"paneCount":4,"estimatedPaneBounds":[34.6375,35.5625,4.7,5.708],"sourcePixelRect":[2355,1350,2410,1400],"pixelCount":2750,"meanSrgb255":[68.954,116.324,142.977],"classification":"mixed-reflection","candidateSrgb":"#4d7388"},
  {"id":"graduate-bay11-layout0-center36.4875-lower-1","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":0,"center":36.4875,"sill":4.7,"paneBand":"lower","paneIndex":1,"paneCount":4,"estimatedPaneBounds":[35.5625,36.4875,4.7,5.708],"sourcePixelRect":[2450,1345,2530,1390],"pixelCount":3600,"meanSrgb255":[69.774,102.306,125.094],"classification":"mixed-reflection","candidateSrgb":"#4c6678"},
  {"id":"graduate-bay11-layout0-center36.4875-lower-2","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":0,"center":36.4875,"sill":4.7,"paneBand":"lower","paneIndex":2,"paneCount":4,"estimatedPaneBounds":[36.4875,37.4125,4.7,5.708],"sourcePixelRect":[2595,1340,2675,1385],"pixelCount":3600,"meanSrgb255":[68.872,98.856,121.065],"classification":"mixed-reflection","candidateSrgb":"#4a6274"},
  {"id":"graduate-bay11-layout0-center36.4875-lower-3","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":0,"center":36.4875,"sill":4.7,"paneBand":"lower","paneIndex":3,"paneCount":4,"estimatedPaneBounds":[37.4125,38.3375,4.7,5.708],"sourcePixelRect":[2715,1315,2770,1345],"pixelCount":1650,"meanSrgb255":[82.876,144.384,182.364],"classification":"blue-reflection","candidateSrgb":"#5e8fad"},
  {"id":"graduate-bay10-layout1-center33.0625-upper-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":10,"layoutIndex":1,"center":33.0625,"sill":0.9,"paneBand":"upper","paneIndex":0,"paneCount":1,"estimatedPaneBounds":[32.2375,33.8875,1.782,3.0],"sourcePixelRect":[2055,1690,2145,1750],"pixelCount":5400,"meanSrgb255":[81.449,114.785,96.66],"classification":"green-blind-appearance","candidateSrgb":"#556f61"},
  {"id":"graduate-bay11-layout1-center35.4875-upper-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":1,"center":35.4875,"sill":0.9,"paneBand":"upper","paneIndex":0,"paneCount":1,"estimatedPaneBounds":[34.6625,36.3125,1.782,3.0],"sourcePixelRect":[2340,1690,2490,1750],"pixelCount":9000,"meanSrgb255":[76.359,109.579,90.894],"classification":"green-blind-appearance","candidateSrgb":"#506a5b"},
  {"id":"graduate-bay11-layout1-center37.4875-upper-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":1,"center":37.4875,"sill":0.9,"paneBand":"upper","paneIndex":0,"paneCount":1,"estimatedPaneBounds":[36.6625,38.3125,1.782,3.0],"sourcePixelRect":[2660,1690,2820,1760],"pixelCount":11200,"meanSrgb255":[87.005,118.864,103.236],"classification":"green-blind-appearance","candidateSrgb":"#5a7467"},
  {"id":"graduate-bay11-layout1-center37.4875-lower-0","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":1,"center":37.4875,"sill":0.9,"paneBand":"lower","paneIndex":0,"paneCount":2,"estimatedPaneBounds":[36.6625,37.4875,0.9,1.782],"sourcePixelRect":[2660,1820,2720,1880],"pixelCount":3600,"meanSrgb255":[57.534,64.42,60.238],"classification":"mixed-blind-and-dark-interior","candidateSrgb":"#3a403c"},
  {"id":"graduate-bay11-layout1-center37.4875-lower-1","buildingId":"graduate-school","partId":"graduate-main","side":"south","bayIndex":11,"layoutIndex":1,"center":37.4875,"sill":0.9,"paneBand":"lower","paneIndex":1,"paneCount":2,"estimatedPaneBounds":[37.4875,38.3125,0.9,1.782],"sourcePixelRect":[2770,1825,2820,1890],"pixelCount":3250,"meanSrgb255":[49.657,68.873,60.689],"classification":"mixed-blind-and-dark-interior","candidateSrgb":"#34433c"},
];
