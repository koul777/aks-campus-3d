import type { LocalPoint } from './geographic-buildings';

/** Source-observed planting only. Coordinates and sizes are photo interpretations, not surveyed trees. */
export type LandscapePlant = {
  id: string;
  buildingId: 'main' | 'library' | 'munhyeong';
  /** Same rotated local EN frame as the referenced building; sample terrain at this point. */
  position: LocalPoint;
  form: 'pruned-rounded' | 'pine-like' | 'deciduous';
  growth: 'tree' | 'shrub';
  height: number;
  crownDiameter: number;
  positionUncertaintyMetres: number;
  confidence: { presence: 'high' | 'medium'; position: 'medium' | 'low'; species: 'unverified' };
  referenceSources: string[];
  notes: string;
};

export const landscapeReferences = {
  main2025: {
    url: 'https://m.blog.naver.com/aksblog/223828845504',
    localFile: 'references/research-20261010/high-resolution-search/blog-20250410_135911.jpg',
    date: '2025-04-10', dateBasis: 'source-filename',
  },
  library2025: {
    url: 'https://m.blog.naver.com/aksblog/223828845504',
    localFile: 'references/research-20261010/high-resolution-search/blog-20250410_133946.jpg',
    date: '2025-04-10', dateBasis: 'source-filename',
  },
  mun2026: {
    url: 'https://m.blog.naver.com/aksblog/224304013123',
    localFile: 'references/research-20261010/high-resolution-search/target-224304013123-0.jpg',
    date: '2026-06-04', dateBasis: 'publication-date',
  },
  munCourt2026: {
    url: 'https://m.blog.naver.com/aksblog/224263386724',
    localFile: 'references/research-20261010/high-resolution-search/target-224263386724-9.jpg',
    date: '2026-04-27', dateBasis: 'publication-date',
  },
  central2021: {
    url: 'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/central.xml',
    localFile: 'references/research-20261010/panorama/central/face-b-1024.jpg; face-r-1024.jpg; face-l-1024.jpg',
    date: '2021', dateBasis: 'project-year; exact-capture-day-unverified',
  },
  satellite: {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    localFile: 'references/campus-satellite.jpg',
    date: 'unknown', dateBasis: 'capture-date-unverified',
  },
} as const;

const confidence = { presence: 'high', position: 'medium', species: 'unverified' } as const;
const uncertainPosition = { presence: 'high', position: 'low', species: 'unverified' } as const;

/** 17 individual candidates: 7 main, 4 library, 6 Mun. No campus-wide random scatter. */
export const landscapePlants: LandscapePlant[] = [
  {id:'main-south-west-deciduous',buildingId:'main',position:[-35,-23],form:'deciduous',growth:'tree',height:4.5,crownDiameter:5.0,positionUncertaintyMetres:4,confidence,referenceSources:['main2025','central2021','satellite'],notes:'2025 정면 왼쪽 끝의 잎이 적은 나무. 전정침엽수와 구분. 줄기 지상점은 그림자·경사 때문에 추정.'},
  {id:'main-south-west-small-pruned',buildingId:'main',position:[-26,-21],form:'pruned-rounded',growth:'tree',height:3.6,crownDiameter:3.4,positionUncertaintyMetres:3,confidence,referenceSources:['main2025','central2021','satellite'],notes:'정면 x약295의 작은 둥근전정수관. 수종 확정 아님.'},
  {id:'main-south-west-large-pruned',buildingId:'main',position:[-16,-22],form:'pruned-rounded',growth:'tree',height:6.5,crownDiameter:5.2,positionUncertaintyMetres:3,confidence,referenceSources:['main2025','central2021','satellite'],notes:'정면 x약400의 여러 층 둥근수관. 단순한 자연형 둥근나무와 실루엣이 다름.'},
  {id:'main-south-stair-west-deciduous',buildingId:'main',position:[-6,-24],form:'deciduous',growth:'tree',height:4.2,crownDiameter:3.8,positionUncertaintyMetres:4,confidence,referenceSources:['main2025','satellite'],notes:'중앙계단 왼쪽 황록색 작은 수관. 계단 폭 안으로 배치하지 말고 실제렌더에서 접합 확인.'},
  {id:'main-south-east-large-pruned',buildingId:'main',position:[16,-22],form:'pruned-rounded',growth:'tree',height:6.4,crownDiameter:5.0,positionUncertaintyMetres:3,confidence,referenceSources:['main2025','satellite'],notes:'정면 x약770의 높은 층상 전정수관. 좌우 대칭을 임의 생성한 것이 아닌 사진 개체.'},
  {id:'main-south-east-small-pruned',buildingId:'main',position:[26,-21],form:'pruned-rounded',growth:'tree',height:3.8,crownDiameter:3.5,positionUncertaintyMetres:3,confidence,referenceSources:['main2025','satellite'],notes:'정면 x약882의 낮은 둥근전정수관.'},
  {id:'main-south-east-deciduous',buildingId:'main',position:[35,-24],form:'deciduous',growth:'tree',height:4.8,crownDiameter:5.0,positionUncertaintyMetres:5,confidence,referenceSources:['main2025','satellite'],notes:'정면 오른쪽 끝의 가지가 드러나는 나무. 주변낮은관목과 구분.'},

  {id:'library-south-central-deciduous',buildingId:'library',position:[-3,-65],form:'deciduous',growth:'tree',height:8.0,crownDiameter:10.0,positionUncertaintyMetres:10,confidence:uncertainPosition,referenceSources:['library2025','central2021','satellite'],notes:'2025 사진 앞쪽의 큰 낙엽수. 존재와 형태는 명확하나 원근으로 건물에서 떨어진 거리는 가장 불확실. 지상점 독립확인 전 자동배치 보류 권고.'},
  {id:'library-southwest-flowering',buildingId:'library',position:[-34,-48],form:'deciduous',growth:'tree',height:4.6,crownDiameter:5.2,positionUncertaintyMetres:7,confidence:uncertainPosition,referenceSources:['library2025','satellite'],notes:'2025 사진 왼쪽 흰 꽃의 낙엽수. 꽃색은 촬영계절 특징이며 항상 흰수관으로 고정하지 않음.'},
  {id:'library-south-east-pruned',buildingId:'library',position:[22,-39],form:'pruned-rounded',growth:'tree',height:3.5,crownDiameter:3.5,positionUncertaintyMetres:5,confidence,referenceSources:['library2025','central2021','satellite'],notes:'2025 정면 오른쪽 창/계단앞 전정수관군 중 명확한 개체 하나. 군집전체를 나무숫자로 확정하지 않음.'},
  {id:'library-southeast-pine',buildingId:'library',position:[48,-50],form:'pine-like',growth:'tree',height:7.5,crownDiameter:7.0,positionUncertaintyMetres:8,confidence:uncertainPosition,referenceSources:['library2025','satellite'],notes:'2025사진 오른쪽 전경 가지가 층진 침엽수. 소나무형태 분류만 가능하며 학명 미확인. 근접사진 단독으로 정확지상점 결정불가.'},

  {id:'mun-east-north-road-pine',buildingId:'munhyeong',position:[40,39],form:'pine-like',growth:'tree',height:8.5,crownDiameter:6.0,positionUncertaintyMetres:7,confidence:uncertainPosition,referenceSources:['munCourt2026','satellite'],notes:'2026 광장사진 오른쪽 도로변의 큰 침엽수. 수관이 겹쳐 단일줄기 위치는 추정.'},
  {id:'mun-east-north-front-deciduous',buildingId:'munhyeong',position:[35,16],form:'deciduous',growth:'tree',height:4.2,crownDiameter:4.0,positionUncertaintyMetres:5,confidence,referenceSources:['munCourt2026','satellite'],notes:'북쪽동 개방부 앞 화단에서 가지가 드러나는 소형 낙엽수. 도로/통행로 안에 배치하지 않음.'},
  {id:'mun-east-north-court-pruned-shrub',buildingId:'munhyeong',position:[39,7],form:'pruned-rounded',growth:'shrub',height:1.7,crownDiameter:3.0,positionUncertaintyMetres:5,confidence,referenceSources:['munCourt2026','satellite'],notes:'북쪽동 앞 낮은 전정관목. 4.56m TreeSmall02를 그대로 배치하면 사진과 다른 큰나무가 됨.'},
  {id:'mun-east-south-entry-conifer',buildingId:'munhyeong',position:[23,-36],form:'pine-like',growth:'tree',height:7.0,crownDiameter:4.0,positionUncertaintyMetres:6,confidence:uncertainPosition,referenceSources:['mun2026','munCourt2026','satellite'],notes:'남쪽동 출입면 사진 왼쪽을 가리는 진녹색 침엽수. 사진 왼쪽은local남쪽. 소나무형 분류는 임시이며 조밀한 전정침엽수일 수 있음.'},
  {id:'mun-east-south-court-deciduous',buildingId:'munhyeong',position:[26,-10],form:'deciduous',growth:'tree',height:4.0,crownDiameter:3.8,positionUncertaintyMetres:6,confidence:uncertainPosition,referenceSources:['munCourt2026','satellite'],notes:'남쪽동과 원형광장 사이 잎/가지가 보이는 작은 수목. 정확줄기와수종 미확인.'},
  {id:'mun-east-central-pruned-shrub',buildingId:'munhyeong',position:[31,0],form:'pruned-rounded',growth:'shrub',height:1.8,crownDiameter:3.2,positionUncertaintyMetres:5,confidence,referenceSources:['munCourt2026','satellite'],notes:'두동 앞 화단의 낮은 전정수목. 통로 중앙이 아니라 식재 화단만 사용해야 하며 구현전 위성/렌더 재확인.'},
];
