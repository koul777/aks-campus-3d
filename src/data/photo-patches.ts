import type { CardinalSide } from './geographic-buildings';

export type PhotoPixel = [x:number,y:number];
export type ReceiverPoint = [east:number,north:number,bodyRelativeHeight:number];
export type FourCorners<T> = [topLeft:T,topRight:T,bottomRight:T,bottomLeft:T];

/** Opt-in appearance experiment. Not measured facade reconstruction and not enabled by default. */
export type PhotoPatch = {
  id:string;
  buildingId:string;
  partId:string;
  side:CardinalSide;
  surface:'glass'|'cladding';
  source:{url:string;imageUrl:string;width:number;height:number;sha256:string;dateNote:string};
  sourcePixels:FourCorners<PhotoPixel>;
  /** Coordinates are before building rotation, relative to this part's body base in height. */
  geometryCorners:FourCorners<ReceiverPoint>;
  normalOffsetMetres:number;
  replace:{generator:'wall-face-region'|'generic-window-region';locator:string;retainFrames:boolean};
  status:'trial-requires-frontal-and-oblique-review';
  enabledByDefault:false;
  geometryIsEstimated:true;
  notes:string;
};

export const photoPatches:PhotoPatch[] = [
  {
    id:'jsg-north-upper-stone-band-trial',buildingId:'jangseogak',partId:'jang-west-archive',side:'north',surface:'cladding',
    source:{url:'https://ksde.co.kr/project/design/70/',imageUrl:'/references/photo-surfaces/jangseogak-architect-original.jpg',width:3665,height:2425,sha256:'af54956cc68c0002cbbf84b029273234aa3f5687231fa98fc59db6cd621b4919',dateNote:'설계사 원본, 촬영일 미확인'},
    sourcePixels:[[2720,1200],[3210,1219],[3210,1267],[2720,1247]],
    // North-facing photograph: photo left is local EAST. Do not reverse this ordering.
    geometryCorners:[[-4,23,13.2],[-31,23,13.2],[-31,23,11.1],[-4,23,11.1]],
    normalOffsetMetres:0.025,
    replace:{generator:'wall-face-region',locator:'north wall E[-31,-4], body Z[11.1,13.2]; above fin tops, excluding dark band and projecting fins',retainFrames:true},
    status:'trial-requires-frontal-and-oblique-review',enabledByDefault:false,geometryIsEstimated:true,
    notes:'수장고 상부의 같은 평면 석재띠만 선택. 사진 왼쪽 return면·램프·핀·수목 제외. 선택폭490px. 모델높이/석재줄눈 스케일은 추정이며 실제사진과 개별줄눈까지 동일등록된 상태가 아님.',
  },
  {
    id:'graduate-south-upper-single-glass-trial',buildingId:'graduate-school',partId:'graduate-main',side:'south',surface:'glass',
    source:{url:'https://m.blog.naver.com/aksblog/223408506698',imageUrl:'/references/photo-surfaces/graduate-2024-original.jpg',width:4032,height:3024,sha256:'3e7326c077e46ca4d4ae732a9ea95732cca52fd87f65d3f0205eb8445d1d7f55',dateNote:'공식 2024 게시물, 정확촬영일 미검증'},
    sourcePixels:[[2438,1338],[2530,1327],[2531,1398],[2439,1408]],
    // South-facing photograph: photo left is local WEST. N=-10.8 is the recessed wall plane.
    geometryCorners:[[35.64,-10.8,5.58],[36.40,-10.8,5.58],[36.40,-10.8,4.83],[35.64,-10.8,4.83]],
    normalOffsetMetres:0.225,
    replace:{generator:'generic-window-region',locator:'Phase13 graduate-main south windowLayouts[0], sill4.7,height2.1, upper2/lower4, eastmost bay index11 (0-based west→east), lower pane index1 (second from west); selected glass interior E[35.64,36.40],Z[4.83,5.58]',retainFrames:true},
    status:'trial-requires-frontal-and-oblique-review',enabledByDefault:false,geometryIsEstimated:true,
    notes:'실제 창의 하단4분할 중 왼쪽에서 두 번째 유리 내부만 선택. 폭92px, 외부나무가 아닌 유리에 포착된 반사/불투명 명암은 원본외관으로 유지. Phase13 상2/하4 windowLayouts와 위치계약을동기화했으나치수는시험추정이며 측량등록이아님. 해당glass사각영역만 대체하고상부2장·나머지하부3장·프레임보존.',
  },
  {
    id:'mun-east-upper-cladding-trial',buildingId:'munhyeong',partId:'mun-south-wing',side:'east',surface:'cladding',
    source:{url:'https://m.blog.naver.com/aksblog/224304013123',imageUrl:'/references/photo-surfaces/munhyeong-2026-original.jpg',width:1200,height:900,sha256:'f339a135a5842197551049b41b6f14aaa468af468591d6df9fd8665b56c7ba3e',dateNote:'2026-06-04 공식게시일 기준'},
    sourcePixels:[[635,218],[755,218],[755,250],[635,250]],
    // East-facing photograph: photo left is local SOUTH, right is local NORTH.
    geometryCorners:[[18,-19.5,14.8],[18,-15,14.8],[18,-15,13.6],[18,-19.5,13.6]],
    normalOffsetMetres:0.025,
    replace:{generator:'wall-face-region',locator:'mun-south-wing east, upper cladding N[-19.5,-15], body Z[13.6,14.8]; above top windows and below roof/eaves',retainFrames:true},
    status:'trial-requires-frontal-and-oblique-review',enabledByDefault:false,geometryIsEstimated:true,
    notes:'같은 평면 석재와 실제 줄눈만 포함, 창틀·처마그림자경계·나무·램프 제외. 폭120px 높이32px이므로 근접고해상도재질은 아님. 원본밝기에는 자연조명과 처마음영이 이미 포함되며 강한PBR조명으로 두번어둡게하지않도록 A/B검수.',
  },
];
