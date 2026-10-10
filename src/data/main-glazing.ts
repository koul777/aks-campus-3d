/** Adopted limited five-opening appearance estimate; never measured glass albedo or a photographic texture. */
export type MainGlazingSample = {
  id: string;
  buildingId: 'main';
  partId: 'main-body';
  side: 'south';
  center: number;
  bottom: 5.35;
  /** Source pixels: left, top, right-exclusive, bottom-exclusive. */
  sourcePixelRect: [number, number, number, number];
  pixelCount: number;
  meanSrgb255: [number, number, number];
  classification: 'dark-interior' | 'mixed-reflection' | 'blue-glare' | 'sky-reflection' | 'muted-cyan';
  candidateSrgb: string;
  notes: string;
};

export const mainGlazingSource = {
  status: 'adopted-limited-appearance-estimate',
  url: 'https://m.blog.naver.com/aksblog/223828845504',
  file: 'references/research-20261010/high-resolution-search/blog-20250410_135911.jpg',
  sha256: 'e0418fcffde4d274553de4a100b7400e3e0c7b95fea26a6eb48544e22dcfad3b',
  width: 1200,
  height: 900,
  date: '2025-04-10',
  dateBasis: 'source filename; same official post as facade reference',
  audit: 'references/research-20261010/main-glazing-audit/samples.json',
  candidateMethod: 'Encoded sRGB channel mean blended 80% with 20% arithmetic channel-neutral grey. No exposure compensation. This is a display-colour starting point, not linear or physical albedo.',
  application: 'Adopted after Phase18 actual near/oblique comparison, limited to five main-body south glazedOpenings matching center and bottom exactly. Replace only selected glass material; preserve frame, pane ordering, dimensions and recessed central entrance. Candidate colours describe one source photograph, not verified view-dependent reflections. Do not paint foliage, copy source images, or add blind slats.',
} as const;

const locator = { buildingId: 'main', partId: 'main-body', side: 'south', bottom: 5.35 } as const;

export const mainGlazingSamples: MainGlazingSample[] = [
  { ...locator, id: 'main-upper-west-outer', center: -30.9, sourcePixelRect: [226,438,244,449], pixelCount:198, meanSrgb255:[27.566,39.308,40.465], classification:'dark-interior', candidateSrgb:'#1d2728', notes:'어두운 유리 내부를 샘플했다. 사진 노출과 반사가 포함된 관측색이며 재질 반사율이 아니다.' },
  { ...locator, id: 'main-upper-west-inner', center: -5.7, sourcePixelRect: [512,437,532,449], pixelCount:240, meanSrgb255:[56.675,81.846,81.963], classification:'mixed-reflection', candidateSrgb:'#3c5050', notes:'원본에는 주변 수목 반사가 보인다. 평균색만 사용하며 수목 무늬나 해당 반사상을 창에 새로 그리지 않는다.' },
  { ...locator, id: 'main-upper-east-inner', center: 5.8, sourcePixelRect: [641,437,661,448], pixelCount:220, meanSrgb255:[73.377,121.464,139.736], classification:'blue-glare', candidateSrgb:'#517786', notes:'확대 판독에서 밝은 점과 푸른 반사가 보인다. 초기 블라인드 추정은 확정할 수 없어 철회했으며 슬랫을 만들지 않는다.' },
  { ...locator, id: 'main-upper-east-middle', center: 10.8, sourcePixelRect: [700,436,720,448], pixelCount:240, meanSrgb255:[69.446,115.208,133.921], classification:'sky-reflection', candidateSrgb:'#4d7180', notes:'상부 주유리의 푸른 반사를 샘플했다. 아래 작은 환기창의 어두운 상태까지 측정한 값은 아니다.' },
  { ...locator, id: 'main-upper-east-outer', center: 30.8, sourcePixelRect: [927,435,945,448], pixelCount:234, meanSrgb255:[72.543,117.12,129.957], classification:'muted-cyan', candidateSrgb:'#4f737d', notes:'청록색 주유리 내부의 평균이다. 사진의 상하 분할과 실제 창의 개폐 상태를 추가 복원하지 않는다.' },
];
