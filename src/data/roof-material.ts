/** One opt-in procedural tile trial. Source-observed directionality, estimated dimensions. */
export const roofMaterialTrial = {
  id: 'tile-soft-overlap-v1',
  enabledByDefault: true,
  scope: 'traditional-tile-only',
  source: {
    url: 'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/hakuijeong.xml',
    file: 'references/research-20261010/panorama/hakuijeong/face-r-3840.jpg',
    sha256: '859630640430f408ba3887d6ce92692da4243eb067362c19c352b8afda00d9c5',
    inspection: 'references/research-20261010/roof-material-audit/haku-roof-source-inspection.jpg',
    note: '2021 project panorama. Roof channels dominate; overlap joints are subordinate. Material colour, joint width and tile dimensions were not surveyed.',
  },
  corroboratingSources: [
    'https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-10.jpg?v=241218',
    'https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-05.jpg?v=241218',
    'https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-09.jpg?v=241218',
    'https://blog.naver.com/aksblog/223043744945',
  ],
  baseline: {
    canvasSize: [128,64],
    longitudinalToneMeanSrgb255: 240,
    longitudinalToneAmplitudeSrgb255: 12,
    overlapRows: [61,62,63],
    overlapOverwriteSrgb255: 180,
    normalSlopeAmplitude: 0.23,
    normalSlopeAxis: 'u-only; v component is constant 128',
    roughness: 0.78,
    metalness: 0.12,
  },
  candidate: {
    /** Multiply existing per-x neutral tone, preserving its corrugation phase. Do not overwrite with constant grey. */
    overlapRowMultipliers: [
      {row:61,multiplier:0.985},
      {row:62,multiplier:0.955},
      {row:63,multiplier:0.985},
    ],
    maxEncodedSrgbAttenuation: 0.045,
    preserveNormalMap: true,
    preserveMaterialColour: true,
    preserveRoughnessMetalness: true,
    preserveContinuousUV: true,
    preserveModuleMetres: [0.33,0.34],
    moduleStatus: 'model estimates, not source measurements',
  },
  validation: 'Compare baseline and candidate at the same near/far cameras for Haku and Cheonggye; inspect Main roof from oblique view. Longitudinal channels should remain visible while transverse checker contrast falls. Do not infer temporal aliasing from a single still. No metal roofs, water, geometry or global illumination changes.',
} as const;
