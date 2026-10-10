import type { LocalPoint } from './geographic-buildings';

/** Bounded photo interpretations. These are visual site grades, not surveyed DEM data. */
export type PhotoSiteGrade = {
  buildingId: string;
  outline: LocalPoint[];
  blendWidth: number;
  /** Extra vertices describe the visual estimate; they do not add surveyed DEM accuracy. */
  minTerrainLevel?: 17 | 18;
  maxTerrainLevel?: 18 | 19;
  /** Keep a landward grade from re-filling the interpreted pool/undercroft. */
  clipToLand?: boolean;
  /** Piecewise-linear northing/height relative to the building model datum. */
  heightProfile: { north: number; height: number }[];
  stairCorridor?: { partId: string; centerEast?: number; halfWidth: number; blendWidth: number; endHeight: number; understepClearance: number };
  sourceUrls: string[];
  status: 'photo-and-coarse-dem-estimate';
  notes: string;
};

export const photoSiteGrades: PhotoSiteGrade[] = [
  {
    buildingId:'gugeun',
    outline:[[-17.5,-10.6],[17.5,-10.6],[18.5,-21],[-18.5,-21]],
    blendWidth:5,
    heightProfile:[{north:-21,height:-2.65},{north:-19,height:-2.35},{north:-16,height:-1.4},{north:-13,height:-0.6},{north:-10.6,height:-0.35}],
    stairCorridor:{partId:'gugeun-body',halfWidth:3.5,blendWidth:1.5,endHeight:-2.35,understepClearance:0.22},
    sourceUrls:['https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-03.jpg?v=241218'],
    status:'photo-and-coarse-dem-estimate',
    notes:'공식 사진의 창 아래 잔디와 낮은 석재 기단, 약14–17단 경계를 참고한 좁은 전면 사면. 15단·문턱0.25m·계단발치-2.35m/7m 깊이는 사진과 접지를 위한 추정이다. 원30mDEM의 전면-3.0~-3.8m는 현장 둔덕을 충분히 표현하지 않아 국소 조정하며 바깥5m에서 복귀한다. 후면·건물 좌표와 높이는 보존한다.',
  },
  {
    buildingId:'jinhyeon',
    outline:[[-17.5,-9.6],[17.5,-9.6],[18.5,-16],[-18.5,-16]],
    blendWidth:5,
    heightProfile:[{north:-16,height:-1.0},{north:-14,height:-0.7},{north:-11,height:-0.4},{north:-9.6,height:-0.4}],
    stairCorridor:{partId:'jinhyeon-body',halfWidth:3.5,blendWidth:1.5,endHeight:0,understepClearance:0.18},
    sourceUrls:['https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-06.jpg?v=241218'],
    status:'photo-and-coarse-dem-estimate',
    notes:'공식 사진의 하층 창 아래 낮은 석재 띠·잔디에 접한 전면만 조정. 3단/.6m 기존상부 높이를 보존하고 출입부 발치에 추정 작은 접근면을 연결하며 이를 신규 실측 계단 단수로 해석하지 않는다. 양 끝 원DEM의 -0.35~-3.5m를 좁은 사진 추정 사면으로 연결한다. 뒤쪽과 범위 바깥5m는 보존한다.',
  },
  {
    buildingId:'unjung',
    outline:[[-25.5,-24.6],[27,-24.6],[28,-34],[-26.5,-34]],
    blendWidth:8,
    heightProfile:[{north:-34,height:-1.8},{north:-31,height:-1.2},{north:-28,height:-0.7},{north:-26,height:-0.3},{north:-24.6,height:-0.3}],
    stairCorridor:{partId:'unjung-front',centerEast:0.75,halfWidth:4,blendWidth:1.75,endHeight:-1.2,understepClearance:0.22},
    sourceUrls:['https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-07.jpg?v=241218'],
    status:'photo-and-coarse-dem-estimate',
    notes:'공식 긴 회랑 앞의 낮은 석재 기단과 잔디 비탈을 참고한 전면 띠. 기존8m폭/5m깊이 계단은 약10–16단 관측범위 안의12단 추정으로 나누고 top1m에서 발치-1.2m를 연결한다. 원30mDEM 전면의 서쪽-0.88m/동쪽-7.62m 차이는 실측 지하층이 아니며 사진 관측면만 국소 보완한다. 양 끝과 바깥8m에서 원지형으로 복귀하고 후면 동·좌표·높이는 보존한다.',
  },
  {
    buildingId: 'hakuijeong',
    outline: [[2.18,-2.35],[5.1,-3],[8.9,-2.8],[10,1.8],[7,3.2],[2.18,2.35]],
    blendWidth: 2,
    minTerrainLevel: 18,
    maxTerrainLevel: 19,
    clipToLand: true,
    heightProfile: [{north:-3,height:1.025},{north:3.2,height:1.025}],
    sourceUrls: [
      'https://www.aks.ac.kr/site/aks/kor/images/sub/img-campusmap-10.jpg?v=241218',
      'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/hakuijeong.htm',
      'https://blog.naver.com/aksblog/223408506698',
      'https://blog.naver.com/aksblog/224263386724',
    ],
    status: 'photo-and-coarse-dem-estimate',
    notes: 'Current 2024/2026 official photographs show two short stone treads and brick paving immediately at the entry. A compact landward bank at estimated H1.025 supports paving H1.10 and the treads below preserved floor H1.65. The shore notch, bank relief, paving thickness and all absolute coordinates/heights are photo-proportioned estimates, not surveyed. The land mask preserves the pond-side undercroft and the margin returns to the coarse DEM.',
  },
  {
    buildingId: 'main',
    outline: [[-38,-14.5],[-39,-31],[-32,-38],[32,-38],[39,-31],[38,-14.5]],
    blendWidth: 5,
    heightProfile: [
      {north:-38,height:-3.8}, {north:-35,height:-3.8},
      {north:-24,height:-1.2}, {north:-18,height:0.2}, {north:-14.5,height:-0.35},
    ],
    stairCorridor: {partId:'main-body',halfWidth:6.5,blendWidth:2,endHeight:-3.8,understepClearance:0.3},
    sourceUrls: [
      'https://m.blog.naver.com/aksblog/223828845504',
      'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/central.htm',
    ],
    status: 'photo-and-coarse-dem-estimate',
    notes: '2025 정면과 항공사진의 남쪽 식재 둔덕·두 계단 비행을 참고한 추정 단면. 중앙 계단 밑은 계단보다 낮게 접합하며 외곽 5m에서 원래 30m DEM으로 복귀한다.',
  },
  {
    buildingId: 'munhyeong',
    outline: [[27.5,6],[43,6],[43,37],[27.5,37]],
    blendWidth: 5,
    heightProfile: [{north:6,height:4.3},{north:37,height:4.3}],
    sourceUrls: ['https://m.blog.naver.com/aksblog/224263386724'],
    status: 'photo-and-coarse-dem-estimate',
    notes: '2026 사진의 북동 개방층 앞마당. 북쪽 동의 +4.2m 추정 단차에 +0.1m 지면을 연결한 좁은 범위이며, 캠퍼스 전체 고도나 도로를 평탄화한 것이 아니다.',
  },
];
