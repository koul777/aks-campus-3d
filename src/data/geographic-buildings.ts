/** Real-world anchors and OSM footprint traces; roof/façade dimensions remain estimates. */
export type LocalPoint = [east: number, north: number];
export type CardinalSide = 'north' | 'south' | 'east' | 'west';
/** Visible short stone access; every absolute dimension/grade is a photo estimate. */
export type SteppedApproach = {
  start: LocalPoint; end: LocalPoint;
  floorElevation: number;
  treads: {depth:number;width:number;elevation:number}[];
  paving: {outline:LocalPoint[];elevation:number;thickness:number};
  bank: {outline:LocalPoint[];topElevation:number;bottomElevation:number;stoneEdges:[LocalPoint,LocalPoint][]};
  sourceUrls: string[];
  status: 'photo-proportioned-estimate';
};
export type BuildingPart = {
  id: string;
  footprint: LocalPoint[];
  baseHeight: number;
  /** Extend only this solid core to sampled ground despite an elevated local floor datum. */
  foundationToGround?: boolean;
  height: number;
  wallColor: string;
  /** Masonry visible in the source photograph; modular brick dimensions remain estimated. */
  wallSurface?: 'brick';
  /** Separate recessed balcony stacks, with row indices beginning at the lowest glazing level. */
  balconyStacks?: {side:CardinalSide;bays:number;openingWidth:number;openingHeight:number;recessDepth:number;floorHeights:number[];railedRows:number[];fasciaHeight:number;railHeight:number;doorPanels:number};
  /** Exposed entrance in a retaining wall, not an above-ground garage volume. */
  retainingEntrance?: {side:CardinalSide;wallSpan:[number,number];wallHeight:number;wallDepth:number;openings:{center:number;width:number;height:number}[];upperGradeDepth:number;approachDepth:number};
  roof: {
    type: 'hip' | 'gable' | 'hip-gable' | 'flat'; height: number; color: string; eaves: number;
    fasciaDepth?: number; fasciaColor?: string; surface?: 'tile' | 'metal';
    /** Courtyard-facing high edge of the continuous sloping perimeter roof. */
    courtyardEdge?: 'north' | 'south' | 'east' | 'west';
    /** Recessed roof light well: local EN bounds, deck rise above wall top, glazed strip width north-south. Photo-proportioned, not surveyed. */
    well?: {bounds:[number,number,number,number];floorRise:number;skylightWidth:number;skylightLength?:number;innerParapetHeight?:number};
  };
  windowBand?: boolean;
  windowRows?: number;
  bayWindowRows?: number[];
  /** Source-proportioned front and glazed returns; row coordinates are part-relative, in metres. */
  photoBayWindows?: {side:CardinalSide;projectionDepth:number;sidePaneWidth:number;frameWidth:number;rows:{bottom:number;height:number;width:number;centers:number[];projected:boolean}[]};
  /** Bounded decorative opaque screens, not extra windows or inferred rooms. */
  facadeScreens?: {side:CardinalSide;center:number;bottom:number;width:number;height:number;color:string;pattern:'diagonal'}[];
  /** Facility-specific gallery treatment; suppress Main-style generic central features where unsupported. */
  colonnadeTreatment?: {suppressCentralGlazing?:boolean;suppressCentralBalcony?:boolean;upperParapet?:{bottom:number;height:number;depth:number;color:string}};
  veranda?: {side:CardinalSide;depth:number;floorHeight:number;railingHeight:number};
  pillarProfile?: {bend:number;taper:number;segments:number};
  /** Explicit photo-proportioned windows on verified faces; dimensions are model estimates in metres. */
  windowLayouts?: {side:CardinalSide;width:number;height:number;sillHeights:number[];mullions:number;bays:number;centers?:number[];endWindowWidth?:number;floorBands?:number[];transom?:{upperFraction:number;upperFractions?:number[];lowerFractions:number[]};lattice?:{pattern:'octagon';columns:number;rows:number}}[];
  columnCount?: number;
  /** Absolute local E on N/S faces, local N on E/W faces; photo-proportioned. */
  columnPositions?: number[];
  colonnades?: {side:CardinalSide;positions:number[];depth:number;width:number;baseHeight?:number}[];
  roundedPilasters?: {side:CardinalSide;centers:number[];radius:number;bottom:number;top:number};
  meanderBands?: {side:CardinalSide;bottom:number;height:number;moduleWidth:number;color:string};
  columnBaseHeight?: number;
  columnWidth?: number;
  /** Bay indices increase east on N/S faces, north on E/W faces. Rows use part-relative heights. */
  framedGlazing?: {side:CardinalSide;bays:number;solidBays:number[];openingsPerBay:number;panesPerOpening:number;pierWidth:number;rows:{bottom:number;height:number}[]};
  /** Individual verified glazing groups; center is absolute local E on N/S, local N on E/W. */
  glazedOpenings?: {side:CardinalSide;center:number;width:number;bottom:number;height:number;panes:number;frameColor?:string}[];
  columnSide?: CardinalSide;
  facadeStyle?: 'colonnade' | 'ribbon' | 'curtain-grid' | 'stone-grid' | 'archive-fins' | 'research' | 'gate' | 'balcony' | 'brick-grid' | 'bay-window' | 'timber';
  facadeSide?: CardinalSide;
  facades?: {side:CardinalSide;style:'archive-fins'|'narrow-openings';bays?:number;rows?:number}[];
  rooftop?: {parapetHeight:number;skylights:number};
  terraceRailing?: {height:number;sides:CardinalSide[]};
  facadeBays?: number;
  porchDepth?: number;
  balconyWidth?: number;
  entrance?: { width: number; doorwayWidth?:number; doorwayHeight?:number; depth: number; steps: number; rise: number;landing?:{start:number;depth:number;rise:number} };
  plaque?: string;
};
export type GeographicBuilding = {
  id: string;
  name: string;
  officialNumber: number;
  kind?: 'building' | 'pavilion' | 'underground-parking' | 'traditional' | 'pond';
  anchor: { longitude: number; latitude: number };
  /** Local EN offset for terrain sampling. Photo-interpreted low ground, not surveyed elevation. */
  groundSampleOffset?: LocalPoint;
  /** Counterclockwise rotation in degrees from east in local ENU. Footprints already oriented when zero. */
  rotationDegrees: number;
  focusSide?: CardinalSide;
  /** Photo-interpreted site context in the same local frame; elevations and outlines are estimates. */
  site?: {water?:{outline:LocalPoint[];elevation:number;color:string};bridge?:{start:LocalPoint;end:LocalPoint;width:number;/** Level deck TOP relative to facility datum; dimensions are photo estimates. */elevation:number};steppedApproach?:SteppedApproach;access?:{landing:{outline:LocalPoint[];elevation:number};stairs:{start:LocalPoint;end:LocalPoint;width:number;steps:number;topHeight:number;bottomHeight:number};railHeight:number}};
  parts: BuildingPart[];
  photoUrl: string;
  photoSourceUrl?: string;
  /** Original source file checksum and publication/capture date note, not model accuracy metadata. */
  photoEvidence?: {date:string;sha256:string;note:string};
  description: string;
  source: string;
  footprintSourceId?: string;
  status: 'osm-footprint-guided-height-estimated' | 'photo-and-imagery-estimated';
};
export const campusOrigin = { longitude: 127.0537, latitude: 37.3926 };
const stone = '#e2ded1';
const tile = '#596362';
const official = 'https://www.aks.ac.kr/site/aks/kor/images/sub/';
const photoNames = ['administration','hall','gugeun','east-pond','cheonggye','jinhyeon','unjung','cafeteria','library','hakuijeong','cheonggye-hakdang','itaekjae','graduate-school','boinjae','shiseubjae','munhyeong','jangseogak','parking','gate'];
function block(id: string, x0: number, y0: number, x1: number, y1: number, height: number, roofHeight = 3, options: Partial<BuildingPart> = {}): BuildingPart {
  return { id, footprint: [[x0,y0],[x1,y0],[x1,y1],[x0,y1]], baseHeight: 0, height, wallColor: stone,
    roof: { type: 'hip', height: roofHeight, color: tile, eaves: 1.6, fasciaDepth:0.3,fasciaColor:stone,surface:'tile' }, windowBand: true, windowRows: 2, ...options };
}
function researchBlock(id:string,x0:number,y0:number,x1:number,y1:number,height:number,rows:number,edge?:BuildingPart['roof']['courtyardEdge']): BuildingPart {
  return block(id,x0,y0,x1,y1,height,2.7,{facadeStyle:'research',windowRows:rows,wallColor:'#e9e8df',
    roof:{type:'hip',height:2.7,color:'#687174',eaves:1.35,fasciaDepth:0.28,fasciaColor:'#e8e7df',surface:'tile',courtyardEdge:edge}});
}
function traced(id: string, name: string, longitude: number, latitude: number, way: string, photo: string, description: string, parts: BuildingPart[]): GeographicBuilding {
  return { id,name,officialNumber:Number(photo),kind:'building',anchor:{longitude,latitude},rotationDegrees:15.5,parts,photoUrl:`/references/${photoNames[Number(photo)-1]}.jpg`,photoSourceUrl:`${official}img-campusmap-${photo}.jpg?v=241218`,description,
    source:`https://www.openstreetmap.org/way/${way}`,footprintSourceId:way,status:'osm-footprint-guided-height-estimated' };
}
function interpreted(id:string,name:string,number:number,pixel:[number,number],kind:GeographicBuilding['kind'],description:string,parts:BuildingPart[]): GeographicBuilding {
  return {id,name,officialNumber:number,kind,anchor:{longitude:127.0485+pixel[0]/1600*0.01,latitude:37.397375-pixel[1]/1400*0.00875},rotationDegrees:15.5,parts,
    photoUrl:`/references/${photoNames[number-1]}.jpg`,photoSourceUrl:`${official}img-campusmap-${String(number).padStart(2,'0')}.jpg?v=241218`,
    description:`${description} 위치·외곽은 위성 영상과 안내도 해석이며 높이는 사진 기반 추정입니다.`,source:'https://www.aks.ac.kr/com/cmm/EgovContentView.do?lang=kor&menuNo=5010182000',status:'photo-and-imagery-estimated'};
}
const flatRoof = {type:'flat' as const,height:0.35,color:'#909795',eaves:0.25,surface:'metal' as const};
/** OSM way vertex means are anchors; aligned rectangles simplify the measured plan outline. */
const facilities: GeographicBuilding[] = [
  traced('main','본관',127.054106175,37.392969125,'568039300','01',
    '위성·OSM의 약 70×29m 외곽을 따르는 2층 본관. 2025-04-10 공식 정면의 14열주, 넓은 중앙 상층 유리와 후퇴 출입문, 상하 두 계단 비행을 반영했습니다. 창·기둥 간격과 계단25~30단 범위에서 선택한28단·고저차는 사진 해석 추정입니다.',[
      block('main-body',-34.7,-14.5,34.7,14.5,8.2,3.2,{columnCount:14,facadeStyle:'colonnade',facadeSide:'south',facadeBays:13,porchDepth:2.4,balconyWidth:7.1,
        columnPositions:[-33.5,-28.3,-23.3,-18.3,-13.1,-8.1,-3.3,3.3,8.3,13.3,18.4,23.3,28.3,33.3],
        facades:[{side:'west',style:'narrow-openings',bays:1,rows:2}],
        glazedOpenings:[
          ...[-30.9,-25.8,-20.8,-15.7,-10.6,-5.7,5.8,10.8,15.85,20.85,25.8,30.8].flatMap(center => [
            {side:'south' as const,center,width:2.8,bottom:1.0,height:1.9,panes:2},
            {side:'south' as const,center,width:2.65,bottom:5.35,height:1.45,panes:2},
          ]),
          {side:'south',center:0,width:6.3,bottom:5.7,height:1.1,panes:5},
          {side:'south',center:0,width:6.0,bottom:0.8,height:2.35,panes:4},
        ],
        entrance:{width:11,depth:18,steps:28,rise:0.8,landing:{start:6,depth:2,rise:-1.2}}}),
    ]),
  traced('hall','강당',127.0537554,37.393376475,'568039301','02',
    '2023 공식 동쪽 사진과 항공의 남쪽 면에서 각각 10열주·9베이를 확인했습니다. 동쪽 하부 남쪽 두 베이의 황동색 출입문과 팔각고리형 창격자를 구분했습니다. 열주·창·격자 반복수와 높이·후퇴 깊이는 사진비례 추정입니다.',[
      block('hall-body',-25.3,-25,25.3,25,12.7,5.0,{windowRows:2,
        colonnades:[
          {side:'east',positions:[-22.5,-17.5,-12.5,-7.5,-2.5,2.5,7.5,12.5,17.5,22.5],depth:3.2,width:1.0},
          {side:'south',positions:[-22.8,-17.733,-12.667,-7.6,-2.533,2.533,7.6,12.667,17.733,22.8],depth:3.2,width:1.0},
        ],
        windowLayouts:[
          {side:'east',width:2.3,height:2.7,sillHeights:[7.0],mullions:0,bays:9,centers:[-20,-15,-10,-5,0,5,10,15,20],lattice:{pattern:'octagon',columns:3,rows:3}},
          {side:'east',width:2.3,height:2.7,sillHeights:[1.0],mullions:0,bays:7,centers:[-20,-5,0,5,10,15,20],lattice:{pattern:'octagon',columns:3,rows:3}},
          {side:'south',width:2.3,height:2.7,sillHeights:[7.0],mullions:0,bays:9,centers:[-20.267,-15.2,-10.133,-5.067,0,5.067,10.133,15.2,20.267],lattice:{pattern:'octagon',columns:3,rows:3}},
          {side:'south',width:2.3,height:2.7,sillHeights:[1.0],mullions:0,bays:8,centers:[-20.267,-15.2,-10.133,-5.067,0,5.067,10.133,15.2],lattice:{pattern:'octagon',columns:3,rows:3}},
        ],
        glazedOpenings:[
          {side:'east',center:-15,width:2.2,bottom:0.45,height:3.3,panes:2,frameColor:'#b7a163'},
          {side:'east',center:-10,width:2.2,bottom:0.45,height:3.3,panes:2,frameColor:'#b7a163'},
          {side:'south',center:20.267,width:2.2,bottom:0.45,height:3.3,panes:2,frameColor:'#b7a163'},
        ],
        facadeSide:'east',facadeBays:9,entrance:{width:32,depth:5,steps:6,rise:0.45}}),
    ]),
  traced('library','한국학도서관',127.052085025,37.3930578083,'568040936','09',
    '중정을 둘러싼 네 날개와 남쪽 확장부. 2025-04-10 공식 정면의 위층 짧은 연속창, 아래층 개별창과 중앙 출입부를 구분했습니다. 나무 뒤의 창과 각 치수는 추정이며 중정은 안내도·위성 해석입니다.',[
      block('library-north',-5.4,12,36.2,24.5,9.5,4),
      block('library-northwest',-28,12,-5.4,31.5,9.5,4,{facades:[{side:'west',style:'narrow-openings',bays:1,rows:2}]}),
      block('library-west',-28,-5.7,-8,12,9.5,4,{windowBand:false,facadeStyle:'curtain-grid',facadeSide:'west',facadeBays:3,windowRows:2}),
      block('library-west-neck',-19.2,-10,-8,-5.7,9.5,1,{windowBand:false}),
      block('library-east',16,-8.1,36.2,12,9.5,4),
      block('library-south',-26.1,-32.2,42.5,-10,9.5,4,{columnCount:14,facadeSide:'south',facadeBays:13,porchDepth:1.5,
        windowLayouts:[{side:'south',width:4.65,height:1.25,sillHeights:[7.3],mullions:2,bays:13}],
        glazedOpenings:[
          ...[-22,-17,-12,-7,-2,3,13.4,18.4,23.4,28.4,33.4,38.4].map(center => ({side:'south' as const,center,width:2.4,bottom:1.3,height:2.0,panes:2})),
          {side:'south',center:8.2,width:6.8,bottom:0.8,height:3.0,panes:4},
        ],
        facades:[{side:'west',style:'narrow-openings',bays:1,rows:2}],
        entrance:{width:10,depth:4,steps:4,rise:0.8},plaque:'한국학도서관'}),
      block('library-southeast-neck',36.2,-10,42.5,-8.1,9.5,1,{windowBand:false}),
    ]),
  traced('munhyeong','문형관',127.05343584,37.39210644,'568031170','16',
      '중앙은 열린 중정이 아닌 파라펫 평옥상입니다. 2026 공식 사진과 항공 파노라마로 확인한 동쪽 면은 위층의 상광폭·하분할 창, 남동 출입문·세로창, 북동 지상층 개방부와 회문 띠가 서로 다릅니다. 북동 바닥은 사진의 상대 지붕 높이와 거친 DEM의 북쪽 상승을 함께 해석하여 남동 기준보다4.2m 높게 추정했습니다. 아래3.2m 개방층·상부3층·국소 앞마당 높이는 실측이 아닙니다.',[
        block('mun-north-lower-core',-28.5,6,24.5,37,3.2,0,{baseHeight:4.2,foundationToGround:true,windowBand:false,wallColor:'#b5b6ae',roof:{type:'flat',height:0,color:'#b5b6ae',eaves:0}}),
        ...[7,17,27,36].map((north,index) => block(`mun-northeast-pilotis-${index}`,27.6,north-0.55,28.8,north+0.55,3.2,0,{baseHeight:4.2,windowBand:false,wallColor:'#e9e8df',roof:{type:'flat',height:0,color:'#e9e8df',eaves:0}})),
        block('mun-north-wing',-28.5,6,29,37,8.5,2.0,{baseHeight:7.4,facadeStyle:'research',windowRows:3,wallColor:'#e9e8df',
          roundedPilasters:{side:'east',centers:[12,22,32],radius:0.35,bottom:-3.2,top:5.5},
          meanderBands:{side:'east',bottom:-0.15,height:0.85,moduleWidth:2.1,color:'#748f98'},
          windowLayouts:[
            {side:'north',width:2.5,height:1.7,sillHeights:[0.55,3.15,5.75],mullions:2,bays:12,floorBands:[2.6,5.2]},
            {side:'east',width:2.4,height:1.8,sillHeights:[0.55,3.15,5.75],mullions:2,bays:7,floorBands:[5.5],transom:{upperFraction:0.55,lowerFractions:[0.45,0.55]}},
          ],
          roof:{type:'hip',height:2.0,color:'#687174',eaves:1.35,fasciaDepth:0.3,fasciaColor:'#e8e7df',surface:'tile',well:{bounds:[-22.5,12,23,31],floorRise:0.65,skylightWidth:2.6,skylightLength:6,innerParapetHeight:1.1}}}),
      researchBlock('mun-connector',-26.5,-2,8.5,6,13,3),
        block('mun-south-wing',-26.5,-41,18,-2,15,2.0,{facadeStyle:'research',facadeSide:'east',windowRows:4,wallColor:'#e9e8df',
          roundedPilasters:{side:'east',centers:[-34,-23,-12],radius:0.36,bottom:0,top:11.0},
          meanderBands:{side:'east',bottom:3.0,height:1.0,moduleWidth:2.2,color:'#748f98'},
          entrance:{width:8.2,depth:2.8,steps:4,rise:0.6},
          glazedOpenings:[
            ...[-38,-35,-32,-29,-14,-11,-8,-5].map(center => ({side:'east' as const,center,width:0.72,bottom:0.7,height:2.0,panes:1})),
            {side:'east',center:-21.5,width:7.0,bottom:0.6,height:2.8,panes:4},
          ],
          windowLayouts:[
            {side:'south',width:2.4,height:1.8,sillHeights:[1.05,4.45,7.85,11.25],mullions:2,bays:9,floorBands:[3.8,7.2,10.6]},
            {side:'east',width:2.4,height:1.8,sillHeights:[4.45,7.85,11.25],mullions:2,bays:9,floorBands:[11.0],transom:{upperFraction:0.55,lowerFractions:[0.28,0.28,0.44]}},
          ],
          roof:{type:'hip',height:2.0,color:'#687174',eaves:1.35,fasciaDepth:0.3,fasciaColor:'#e8e7df',surface:'tile',well:{bounds:[-20.5,-35,12,-8],floorRise:0.65,skylightWidth:2.6,skylightLength:6,innerParapetHeight:1.1}}}),
    ]),
  traced('jangseogak','장서각',127.0542707857,37.3919575786,'568031171','17',
      '유리 열주동과 밝은 석재의 무창 수장동을 결합한 복합동입니다. 설계사 공식 사진과 2021년 항공 파노라마에서 얕은 금속지붕·석재 세로핀·수평 띠를 확인했습니다. 치수와 가려진 면은 추정입니다.',[
      // Viewed southward from the sports field: image right = geographic west.
      // Therefore the windowless north-facing archive is the WEST block, not the long east wing.
      block('jang-west-archive',-34,0,2,23,13.8,1.7,{windowBand:false,windowRows:3,facadeStyle:'archive-fins',facadeSide:'north',facadeBays:9,
        facades:[{side:'north',style:'archive-fins',bays:9,rows:3}],
        roof:{type:'hip',height:1.7,color:'#a6acab',eaves:1.8,fasciaDepth:0.35,fasciaColor:'#626c6c',surface:'metal'}}),
      block('jang-south-wing',-28,-28,13,0,13.2,1.9,{windowBand:false,
        roof:{type:'hip',height:1.9,color:'#a6acab',eaves:1.8,fasciaDepth:0.3,fasciaColor:'#626c6c',surface:'metal'}}),
      block('jang-connector',-17,-5,12,12,11.5,0.5,{windowBand:false,
        // The architect's sports-field view shows the entry recessed between the two north masses.
        // Opening dimensions and landing/stair levels are proportional estimates, not survey values.
        glazedOpenings:[{side:'north',center:7,width:3.2,bottom:3.1,height:3,panes:2}],
        roof:{type:'flat',height:0.5,color:'#a6acab',eaves:0.3,surface:'metal'}}),
      block('jang-east-public-wing',12,-20,56,17,14.5,2.0,{windowBand:false,windowRows:2,facadeSide:'north',facadeBays:5,columnCount:6,columnSide:'north',columnBaseHeight:3.1,columnWidth:0.9,porchDepth:1.4,
        framedGlazing:{side:'north',bays:5,solidBays:[4],openingsPerBay:2,panesPerOpening:3,pierWidth:0.65,rows:[{bottom:3.35,height:3.1},{bottom:7.75,height:4.0}]},
        facades:[{side:'east',style:'narrow-openings',bays:7,rows:3}],
        roof:{type:'hip',height:2,color:'#a6acab',eaves:1.8,fasciaDepth:0.35,fasciaColor:'#626c6c',surface:'metal',well:{bounds:[21,-9,48,6],floorRise:0.5,skylightWidth:3.5}}}),
      block('jang-east-glass-stair',54,-6,59,1,14.5,0.1,{windowBand:false,facadeStyle:'curtain-grid',facadeSide:'east',facadeBays:2,windowRows:4,
        roof:{type:'flat',height:0.1,color:'#79898a',eaves:0.1,surface:'metal'},wallColor:'#526d74'}),
    ]),
  {
    id:'gate',name:'정문',officialNumber:19,kind:'building',anchor:{longitude:127.0554792881,latitude:37.3918263793},rotationDegrees:17.5,focusSide:'south',
    parts:[
      // 2021 down-cube shows four large posts on each bank; all dimensions remain photo estimates.
      ...[-1,1].flatMap(bank => [7.6,9.3].flatMap((distance,column) => [-0.95,0.95].map((north,row) =>
        block(`gate-${bank<0?'west':'east'}-large-${column}-${row}`,bank*distance-0.62,north-0.65,bank*distance+0.62,north+0.65,7.3-column*0.2,0,
          {wallColor:'#c7cbc9',windowBand:false,pillarProfile:{bend:-bank*0.4,taper:0.78,segments:13},roof:{type:'flat',height:0.04,color:'#c7cbc9',eaves:0}})))),
      ...[-1,1].flatMap(bank => [11.5,12.8].flatMap((distance,column) => [-0.8,0.8].map((north,row) =>
        block(`gate-${bank<0?'west':'east'}-small-${column}-${row}`,bank*distance-0.32,north-0.36,bank*distance+0.32,north+0.36,3.8-column*0.3,0,
          {wallColor:'#d1d4cf',windowBand:false,pillarProfile:{bend:-bank*0.15,taper:0.82,segments:7},roof:{type:'flat',height:0.04,color:'#d1d4cf',eaves:0}})))),
      block('gate-sign-wall',-10.4,-20,-9.6,-5,2.4,0,{wallColor:'#c6c9c4',windowBand:false,facadeStyle:'gate',facadeSide:'east',plaque:'한국학중앙연구원',roof:{type:'flat',height:0.06,color:'#c6c9c4',eaves:0}}),
      {id:'gate-octagonal-guardhouse',footprint:Array.from({length:8},(_,index):LocalPoint => {
        const angle=(22.5+index*45)*Math.PI/180;
        return [15.24+5.2*Math.cos(angle),-5.30+5.2*Math.sin(angle)];
      }),baseHeight:0,height:2.6,wallColor:'#d8d6cc',windowBand:false,
        roof:{type:'hip',height:1.2,color:'#8d999b',eaves:0.7,surface:'metal'},
      },
    ],
    photoUrl:'/references/gate.jpg',photoSourceUrl:`${official}img-campusmap-19.jpg?v=241218`,
    description:'2021 항공사진의 팔각 경비실·주차장 교차점과 위성을 대조하여 정문을 교차점 남쪽으로 교정했습니다. 양안 큰 기둥 각4개, 서쪽 안내석벽, 동쪽 팔각 경비실을 반영했습니다. 기준점 판독 ±2.4~3.6m 외 위성 정합 오차가 있으며 기둥 간격·높이·작은 기둥 수·도로각17.5도·석벽 끝점·경비실 높이와 벽 후퇴는 영상 추정입니다.',
    source:'https://www.aks.ac.kr/com/cmm/EgovContentView.do?lang=kor&menuNo=5010182000',status:'photo-and-imagery-estimated',
  },
  traced('gugeun','국은관',127.05352005,37.39390835,'568039517','03','숲속의 2층 연구동. 사진의 돌출 창틀, 중앙 현관과 긴 계단을 반영했습니다.',[
    block('gugeun-body',-17.5,-11,17.5,11,7.5,3.0,{facadeStyle:'bay-window',facadeSide:'south',facadeBays:6,bayWindowRows:[1],entrance:{width:7,depth:7,steps:15,rise:0.25,doorwayHeight:2.8},
      // Official gallery 23235: flat lower lights, portrait projecting upper bays. Dimensions remain estimates.
      photoBayWindows:{side:'south',projectionDepth:0.55,sidePaneWidth:0.40,frameWidth:0.10,rows:[
        {bottom:0.85,height:1.9,width:2.6,centers:[-14.58,-8.75,8.75,14.58],projected:false},
        {bottom:4.55,height:2.25,width:1.65,centers:[-14.58,-8.75,-2.92,2.92,8.75,14.58],projected:true},
      ]}}),
    block('gugeun-entry-canopy',-5,-14,5,-10.8,0.32,0,{baseHeight:3.3,wallColor:'#e0e1d9',windowBand:false,roof:{type:'flat',height:0.06,color:'#c5c9c3',eaves:0.1}}),
    // Grey box-like upstand visible in official03/gallery23235; use remains unverified.
    block('gugeun-entry-upstand-front',-5,-14,5,-13.78,0.58,0,{baseHeight:3.62,wallColor:'#a2a7a0',windowBand:false,roof:{type:'flat',height:0,color:'#a2a7a0',eaves:0}}),
    ...[-1,1].map(sign=>block(`gugeun-entry-upstand-${sign<0?'west':'east'}`,sign<0?-5:4.78,-13.78,sign<0?-4.78:5,-10.8,0.58,0,{baseHeight:3.62,wallColor:'#a2a7a0',windowBand:false,roof:{type:'flat',height:0,color:'#a2a7a0',eaves:0}})),
  ]),
  interpreted('east-pond','동편연못',4,[830,485],'pond','북쪽 연구동 동편 숲속의 연못입니다. 공식 사진의 흰색 아치다리를 가진 동편 연못이며 서쪽 큰 저수지와 구분합니다.',[
    {id:'pond-water',footprint:[[-17,-5],[-12,-12],[2,-14],[15,-8],[18,5],[8,13],[-8,11],[-18,3]],baseHeight:0,height:0,wallColor:'#486f64',roof:{type:'flat',height:0,color:'#486f64',eaves:0},windowBand:false},
  ]),
  traced('cheonggye','청계관',127.0532741,37.39419955,'568039518','05','2층의 연한 크림 외벽과 돌출 창틀, 짙은 기와 처마를 가진 게스트하우스입니다.',[
    block('cheonggye-body',-16.5,-10.5,16.5,10.5,7.5,2.8,{facadeStyle:'bay-window',facadeSide:'south',facadeBays:6,entrance:{width:5,depth:2.5,steps:3,rise:0.6}}),
  ]),
  traced('jinhyeon','진현관',127.052989625,37.39447855,'568039519','06','연한 크림색의 2층 동이며 사진의 돌출 창과 중앙 현관 캐노피를 구분합니다.',[
    block('jinhyeon-body',-17.5,-10,17.5,10,7.5,2.8,{facadeStyle:'bay-window',facadeSide:'south',facadeBays:7,entrance:{width:7,depth:3,steps:3,rise:0.6},
      // Official gallery 23234: both rows project, while the central entrance strip carries reddish screens.
      photoBayWindows:{side:'south',projectionDepth:0.55,sidePaneWidth:0.40,frameWidth:0.10,rows:[
        {bottom:0.80,height:2.25,width:1.65,centers:[-15,-10,-5,5,10,15],projected:true},
        {bottom:4.55,height:2.25,width:1.65,centers:[-15,-10,-5,5,10,15],projected:true},
      ]},facadeScreens:[
        {side:'south',center:0,bottom:4.10,width:3.6,height:1.10,color:'#674239',pattern:'diagonal'},
        {side:'south',center:0,bottom:2.55,width:3.6,height:0.62,color:'#674239',pattern:'diagonal'},
      ]}),
    block('jinhyeon-canopy',-4,-13,4,-10,0.4,0,{baseHeight:3.3,windowBand:false,roof:flatRoof,wallColor:'#a9b1ac'}),
  ]),
  traced('unjung','운중관',127.0526401833,37.395021175,'568039621','07','긴 2층 전면과 열주·회랑을 가진 북쪽 게스트하우스입니다. 후면 연결부와 작은 부속동은 OSM 외곽에 맞춰 나누었습니다.',[
    block('unjung-front',-25.5,-25,27,-1,8.2,3.2,{facadeStyle:'colonnade',facadeSide:'south',facadeBays:10,columnCount:11,porchDepth:1.5,entrance:{width:8,doorwayWidth:2.73,depth:5,steps:12,rise:1},
      // Official gallery 23237–23239: continuous opaque upper gallery, not Main's central glazed balcony.
      colonnadeTreatment:{suppressCentralGlazing:true,suppressCentralBalcony:true,upperParapet:{bottom:4.10,height:1.10,depth:0.22,color:'#e2ded1'}}}),
    block('unjung-link',-4,-1,4,6,6.5,2.2),
    block('unjung-back',-14.5,5,12.5,17.5,6.5,2.4),
  ]),
  traced('cafeteria','식당/매점',127.0529455,37.393282625,'568039516','08','항공·위성에서 확인한 단일 큰 기와지붕과 작은 굴뚝의 낮은 식당입니다. 공식08 뒤의 다른 높은 건물을 중앙 상부동으로 오독했던 부분을 제거했습니다. 2024 남쪽 테라스 사진의 개별 창·검은 상부격자와 공식08 동쪽 출입부를 구분하되 면방위·베이·테라스 범위와 치수는 지도 대조 추정입니다.',[
    // 2024 south terrace and official08 east plaza are different faces; no wraparound glass assumption.
    block('cafeteria-main',-22.3,-16,22.3,16,4.2,4.3,{facadeSide:'south',windowRows:1,porchDepth:1.5,
      glazedOpenings:[
        ...[-16,-8,0,8,16].map(center => ({side:'south' as const,center,width:4.4,bottom:0.75,height:2.25,panes:2,frameColor:'#c8c9c0'})),
        {side:'east',center:-9,width:6.0,bottom:0.7,height:2.35,panes:3},
        {side:'east',center:0,width:8.0,bottom:0.4,height:2.9,panes:4},
        {side:'east',center:9,width:6.0,bottom:0.7,height:2.35,panes:3},
      ]}),
    // Opaque dark grille zone observed above the south windows, represented as shallow source-bounded panels.
    ...[-16,-8,0,8,16].map((east,index) => block(`cafeteria-south-grille-${index}`,east-2.2,-14.57,east+2.2,-14.47,0.52,0,{baseHeight:3.1,wallColor:'#343a34',windowBand:false,roof:{type:'flat',height:0,color:'#343a34',eaves:0}})),
    // Small central projecting terrace visible in 2024; extent is estimated, not the entire yard.
    block('cafeteria-south-terrace-slab',-3.3,-19,3.3,-16,0.18,0,{baseHeight:0.35,windowBand:false,wallColor:'#d9d4be',roof:{type:'flat',height:0,color:'#d9d4be',eaves:0}}),
    block('cafeteria-south-terrace-rail-front',-3.3,-19,3.3,-18.78,0.18,0,{baseHeight:1.25,windowBand:false,wallColor:'#dfd9c4',roof:{type:'flat',height:0,color:'#dfd9c4',eaves:0}}),
    ...[-3.1,-2.1,-1.1,0,1.1,2.1,3.1].map((east,index) => block(`cafeteria-south-baluster-${index}`,east-0.14,-18.98,east+0.14,-18.76,0.75,0,{baseHeight:0.53,windowBand:false,wallColor:'#dfd9c4',roof:{type:'flat',height:0,color:'#dfd9c4',eaves:0}})),
    block('cafeteria-roof-chimney',-2.0,-0.6,-0.7,0.6,1.2,0,{baseHeight:8.3,windowBand:false,wallColor:'#77736a',roof:{type:'flat',height:0.12,color:'#66665f',eaves:0.08}}),
  ]),
  interpreted('hakuijeong','학의정',10,[448,652],'pavilion','2021년 공식 파노라마에서 사각 정자·흰 수상 기초와 연못 북쪽 가장자리의 위치를 확인했습니다. XML 좌표는 남쪽 잔디 위 촬영 지점이므로 정자 중심으로 사용하지 않습니다. 정자 중심은 촬영점에서 북쪽 약28m로 사진·위성을 교차 해석한 값이며 연못 경계와 접근 데크도 추정입니다.',[
    {id:'hakuijeong-pavilion',footprint:[[-2.2,-2.2],[2.2,-2.2],[2.2,2.2],[-2.2,2.2]],baseHeight:1.3,height:2.7,wallColor:'#a76e37',roof:{type:'hip',height:1.7,color:'#4e585b',eaves:0.9,surface:'tile'},windowBand:false,facadeStyle:'timber'},
  ]),
  interpreted('cheonggye-hakdang','청계학당',11,[375,652],'traditional','공식 외관사진의 앞 회랑·높은 뒤 중심채·양옆 날개에 더해 서쪽 낮은 부속채 두 지붕과 동북쪽 작은 지붕을 분리한 한옥군입니다. 2021년 파노라마에서는 수목에 가려 이 부속부의 당시·현재 형태가 모두 확인되지는 않으므로 공식 사진의 촬영연도와 현황 일치를 단정하지 않습니다.',[
    block('hakdang-front',-18,-14,18,-5,3.8,2.6,{wallColor:'#b67b40',facadeStyle:'timber',facadeSide:'south',columnCount:10,porchDepth:3.0,veranda:{side:'south',depth:3.0,floorHeight:1.0,railingHeight:0.85},roof:{type:'hip-gable',height:2.6,color:'#404a4d',eaves:1.4,surface:'tile'}}),
    block('hakdang-back',-12,7,12,16,5.4,3.0,{wallColor:'#b67b40',facadeStyle:'timber',roof:{type:'gable',height:3,color:'#404a4d',eaves:1.4,surface:'tile'}}),
    block('hakdang-west',-18,-5,-11,7,3.5,2.2,{wallColor:'#c18b4c',facadeStyle:'timber',roof:{type:'gable',height:2.2,color:'#404a4d',eaves:1.2,surface:'tile'}}),
    block('hakdang-east',11,-5,18,7,3.5,2.2,{wallColor:'#c18b4c',facadeStyle:'timber',roof:{type:'gable',height:2.2,color:'#404a4d',eaves:1.2,surface:'tile'}}),
    // Official11 shows staggered lower roofs west of the front hall; the exact joins are occluded.
    block('hakdang-west-outer',-29,-9,-18,1,2.8,2.0,{wallColor:'#ddd7c5',facadeStyle:'timber',facadeSide:'south',facadeBays:4,roof:{type:'hip-gable',height:2.0,color:'#404a4d',eaves:1.05,surface:'tile'}}),
    block('hakdang-west-rear-annex',-26,1,-15,9,3.1,2.2,{wallColor:'#ddd7c5',facadeStyle:'timber',facadeSide:'south',facadeBays:3,roof:{type:'hip-gable',height:2.2,color:'#404a4d',eaves:1.05,surface:'tile'}}),
    block('hakdang-northeast-small-wing',18,8,25,12.5,2.6,1.6,{wallColor:'#af7f4b',facadeStyle:'timber',facadeSide:'south',facadeBays:2,roof:{type:'gable',height:1.6,color:'#404a4d',eaves:0.9,surface:'tile'}}),
  ]),
  interpreted('itaekjae','이택재',12,[252,655],'building','2024년 준공 기숙사로 공식 사진의 살구색 벽돌, 평지붕, 4열의 넓은 발코니와 4층 구성을 따릅니다. 오래된 위성 영상과 현재 외형 사이의 차이가 있을 수 있습니다.',[
    block('itaekjae-main',-15,-11,15,11,14.6,0,{wallSurface:'brick',wallColor:'#c58f70',facadeSide:'south',facadeBays:4,windowRows:4,roof:flatRoof,
      balconyStacks:{side:'south',bays:4,openingWidth:5.8,openingHeight:2.8,recessDepth:1.2,floorHeights:[0.35,3.65,6.95,10.25],railedRows:[1,2,3],fasciaHeight:0.55,railHeight:0.95,doorPanels:4}}),
    block('itaekjae-stair',-3,6,3,13,15.2,0,{wallSurface:'brick',wallColor:'#bd876a',windowRows:4,roof:flatRoof}),
  ]),
  traced('graduate-school','한국학대학원',127.0505490667,37.3928214667,'568041256','13','긴 2층 건물의 중앙에 기와 현관과 두꺼운 기둥을 둔 대학원 건물입니다.',[
    block('graduate-main',-14.4,-12,38.7,11.4,8.0,3.0,{facadeStyle:'colonnade',facadeSide:'south',facadeBays:12,columnCount:13,porchDepth:1.2,
      windowLayouts:[
        {side:'south',width:3.7,height:2.1,sillHeights:[4.7],mullions:0,bays:12,centers:Array.from({length:12},(_,index)=>-14.4+53.1*(index+0.5)/12),transom:{upperFraction:0.52,upperFractions:[0.5,0.5],lowerFractions:[0.25,0.25,0.25,0.25]}},
        {side:'south',width:1.65,height:2.1,sillHeights:[0.9],mullions:0,bays:20,
          centers:Array.from({length:12},(_,index)=>-14.4+53.1*(index+0.5)/12).flatMap(center=>[center-1.0,center+1.0]).filter(center=>Math.abs(center-12.15)>4.5),
          transom:{upperFraction:0.58,lowerFractions:[0.5,0.5]}},
      ],entrance:{width:9,depth:4,steps:4,rise:0.8}}),
    block('graduate-west-annex',-24,-11.4,-14.4,0.4,3.8,1.8,{windowBand:false,facades:[{side:'west',style:'narrow-openings',bays:3,rows:1}],roof:{type:'hip',height:1.8,color:'#596362',eaves:1.0,surface:'tile'}}),
    block('graduate-entry-roof',2,-16,13,-11,3.1,1.2,{wallColor:'#e2ded1',facadeStyle:'colonnade',columnCount:4,porchDepth:2,roof:{type:'gable',height:1.2,color:'#495456',eaves:0.8,surface:'tile'}}),
  ]),
  interpreted('boinjae','보인재',14,[434,834],'building','2024년 준공 일반 기숙사는 공식 자료상 지상4층입니다. 높은 잔디 쪽의 3층과 낮은 주차장 쪽 추가층, 두 주동 사이 낮은 유리 연결부와 난간 옥상을 구분했습니다. 주차장 면의 방위·지반 고저차와 현재 외곽은 추정입니다.',[
    // Lowest visible floor is the local zero datum; upper wings begin 3.1m above it.
    // Coarse DEM cannot resolve the courtyard terraces: no sub-terrain negative floor is used.
    // Parking-side cardinal assignment remains a map-based inference pending current surveyed layout.
    block('boin-west-lower',-31,-6,-8,16,3.1,0,{baseHeight:0,wallColor:'#be947a',windowBand:false,facadeSide:'west',glazedOpenings:[{side:'west',center:5,width:20.8,bottom:0.15,height:2.65,panes:12,frameColor:'#8b9794'}],roof:flatRoof}),
    block('boin-west',-31,-6,-8,16,11.3,0,{baseHeight:3.1,wallSurface:'brick',wallColor:'#be947a',facadeStyle:'brick-grid',facadeSide:'south',facadeBays:4,windowRows:3,roof:flatRoof}),
    block('boin-east-lower',4,-23,31,15,3.1,0,{baseHeight:0,wallColor:'#be947a',windowBand:false,roof:flatRoof}),
    block('boin-east',4,-23,31,1,11.3,0,{baseHeight:3.1,wallSurface:'brick',wallColor:'#be947a',facadeStyle:'brick-grid',facadeSide:'south',facadeBays:5,windowRows:3,roof:flatRoof}),
    block('boin-north',3,1,31,15,11.3,0,{footprint:[[3,1],[31,1],[31,9],[23,9],[23,15],[3,15]],baseHeight:3.1,wallSurface:'brick',wallColor:'#be947a',facadeStyle:'brick-grid',windowRows:3,
      windowLayouts:[
        // Source shows one narrow vertical glazed stack beside the corner glazing; stacked panels are not proof of storey count.
        {side:'east',centers:[6.5],width:1.45,height:2.48,sillHeights:[2.85,5.55,8.25],mullions:0,bays:1},
        {side:'north',centers:[6,11,16,21],width:2.4,height:1.9,sillHeights:[0.85,4.15,7.45],mullions:1,bays:4},
      ],glazedOpenings:[{side:'east',center:6.5,width:1.45,bottom:0.15,height:2.48,panes:1,frameColor:'#818c89'}],roof:flatRoof}),
    block('boin-low-glazed-link',-8,-3,5,10,3.1,0,{baseHeight:0,wallColor:'#be947a',windowBand:false,facadeSide:'west',glazedOpenings:[
      {side:'west',center:-0.1,width:4.4,bottom:0.15,height:2.65,panes:3,frameColor:'#8b9794'},
      {side:'west',center:3.5,width:2.4,bottom:0.15,height:2.65,panes:2,frameColor:'#8b9794'},
      {side:'west',center:7.1,width:4.4,bottom:0.15,height:2.65,panes:3,frameColor:'#8b9794'},
    ],terraceRailing:{height:1.05,sides:['west','north','south']},roof:flatRoof}),
    block('boin-wing-glass-stair',23,9,31,16,11.3,0,{baseHeight:3.1,wallColor:'#657d81',windowBand:false,facadeStyle:'curtain-grid',facadeSide:'north',facadeBays:3,windowRows:3,framedGlazing:{side:'east',bays:1,solidBays:[],openingsPerBay:1,panesPerOpening:4,pierWidth:0.12,rows:[{bottom:0.5,height:3},{bottom:3.65,height:3},{bottom:6.8,height:3}]},roof:flatRoof}),
  ]),
  traced('shiseubjae','시습재',127.0522516286,37.3919008857,'495418884','15','붉은 벽돌의 긴 기숙사 동과 두 개의 높은 직사각 계단탑을 표현합니다. 평면은 OSM 외곽을 분해하고 사진에서 보이는 벽돌 줄눈과 수평 띠를 구분합니다.',[
    block('shiseub-north',-45,8,17,27,10.7,0,{wallSurface:'brick',wallColor:'#9b5746',facadeStyle:'brick-grid',facadeSide:'north',facadeBays:11,windowRows:3,roof:flatRoof,
      windowLayouts:[{side:'north',width:3.7,height:1.9,sillHeights:[0.9,4.1,7.3],mullions:2,bays:11,floorBands:[3.3,6.5,9.7]}]}),
    block('shiseub-east',1,-43,54,8,10.7,0,{wallSurface:'brick',wallColor:'#9b5746',facadeStyle:'brick-grid',facadeSide:'south',facadeBays:12,windowRows:3,roof:flatRoof}),
    block('shiseub-west',-28,-19,1,-3,10.7,0,{wallSurface:'brick',wallColor:'#9b5746',facadeStyle:'brick-grid',windowRows:3,roof:flatRoof}),
    block('shiseub-tower-west',-35,23,-27,31,16.1,0,{wallSurface:'brick',wallColor:'#99503f',windowBand:false,roof:flatRoof}),
    block('shiseub-tower-east',6,23,14,31,16.1,0,{wallSurface:'brick',wallColor:'#99503f',windowBand:false,roof:flatRoof,
      // Short upper slots on the tall tower in official15; do not copy these onto the clock-bearing west face.
      glazedOpenings:[8.3,10,11.7].map(center=>({side:'north' as const,center,width:0.18,bottom:13.05,height:2.45,panes:1,frameColor:'#a3a69c'}))}),
    // Glazing widths are source-proportioned; existing face assignment is retained pending a surveyed elevation.
    block('shiseub-west-tower-glass',-32.5,30.8,-29.5,31.15,11.8,0,{baseHeight:0.5,wallColor:'#405c61',windowBand:false,facadeStyle:'curtain-grid',facadeSide:'north',facadeBays:2,windowRows:4,roof:{type:'flat',height:0,color:'#405c61',eaves:0}}),
    block('shiseub-east-tower-glass',8.5,30.8,11.5,31.15,11.8,0,{baseHeight:0.5,wallColor:'#405c61',windowBand:false,facadeStyle:'curtain-grid',facadeSide:'north',facadeBays:2,windowRows:4,roof:{type:'flat',height:0,color:'#405c61',eaves:0}}),
    block('shiseub-roof-setback',-39,12,11,22,2.5,0,{baseHeight:10.7,wallColor:'#ddd9cb',facadeStyle:'ribbon',facadeSide:'north',windowRows:1,roof:{type:'flat',height:0.22,color:'#c69597',eaves:1.0}}),
  ]),
  interpreted('parking','지하주차장',18,[1033,817],'underground-parking','2021년 장서각 항공사진과 위성의 운동장 남동쪽 옹벽·하부 포장 접점을 함께 해석한 위치입니다. 남쪽 진입광장을 향한 연속 석재 옹벽 안의 두 출입구와 북쪽 상부 운동장 지반을 구분하며, 옹벽 높이와 개구 치수·성토 단면은 실측이 아닙니다.',[
    block('parking-entry',-11.7,-0.5,17.3,0.1,5.3,0,{wallColor:'#c6c4b8',windowBand:false,facadeSide:'south',roof:{type:'flat',height:0,color:'#7b8b64',eaves:0},plaque:'PARKING',
      retainingEntrance:{side:'south',wallSpan:[-11.7,17.3],wallHeight:5.3,wallDepth:0.6,openings:[{center:5.2,width:5,height:3.3},{center:10.85,width:5,height:3.3}],upperGradeDepth:5,approachDepth:18}}),
  ]),
];
// Explicit selection direction avoids choosing a low annex as the representative fa?ade.
const boin = facilities.find((facility) => facility.id === 'boinjae')!;
// East view reveals the source-observed right-hand corner glazing; this is a feature-facing view, not a verified photo capture azimuth.
boin.focusSide = 'east';
const main = facilities.find((facility) => facility.id === 'main')!;
main.photoUrl = '/references/main-20250410.jpg';
main.photoSourceUrl = 'https://m.blog.naver.com/aksblog/223828845504';
main.photoEvidence = {date:'2025-04-10',sha256:'e0418fcffde4d274553de4a100b7400e3e0c7b95fea26a6eb48544e22dcfad3b',note:'공식 블로그 원본, 파일명 촬영일 기준; 원본 바이트 보존. 남쪽 입면 확인, 치수 추정.'};
const hall = facilities.find((facility) => facility.id === 'hall')!;
hall.focusSide = 'east';
hall.photoUrl = '/references/hall-20230224.jpg';
hall.photoSourceUrl = 'https://m.blog.naver.com/aksblog/223037218583';
hall.photoEvidence = {date:'2023-02-24',sha256:'1a855bd98f362f72d9f4f75790bd691e704c3e199388d5e55025730c18809b5a',note:'공식 원본 EXIF 촬영일 2023-02-24 15:27:38. 동쪽10열주·9베이 확인; 남쪽은항공대조. 치수/격자반복수추정.'};
const graduate = facilities.find((facility) => facility.id === 'graduate-school')!;
graduate.focusSide = 'south';
graduate.photoUrl = '/references/graduate-20240407.jpg';
graduate.photoSourceUrl = 'https://m.blog.naver.com/aksblog/223408506698';
graduate.photoEvidence = {date:'2024-04-07',sha256:'3e7326c077e46ca4d4ae732a9ea95732cca52fd87f65d3f0205eb8445d1d7f55',note:'원본 EXIF DateTimeOriginal 2024-04-07 13:41:35 직접확인. 남쪽상층상2/하4, 하층상1/하2창. 가려진베이와치수추정.'};
graduate.description += ' 2024 공식 남쪽 근접사진의 상층 상2·하4분할과 하층 상1·하2분할 창을 구분했으며 수목 뒤 베이수·치수는 추정입니다.';
const cafeteria = facilities.find((facility) => facility.id === 'cafeteria')!;
cafeteria.focusSide = 'south';
cafeteria.photoUrl = '/references/cafeteria-20240407.jpg';
cafeteria.photoSourceUrl = graduate.photoSourceUrl;
cafeteria.photoEvidence = {date:'2024-04-07',sha256:'d5cde48f258553bc97ebdf8ba43e9ff80d86e118d771a7666af3d423318a0017',note:'원본 EXIF DateTimeOriginal 2024-04-07 14:02:01 직접확인. 남쪽테라스면으로항공관계해석. 반대편/가려진면미확정; 동쪽출입부는공식08별도대조.'};
const library = facilities.find((facility) => facility.id === 'library')!;
library.focusSide = 'south';
library.photoUrl = '/references/library-20250410.jpg';
library.photoSourceUrl = main.photoSourceUrl;
library.photoEvidence = {date:'2025-04-10',sha256:'43b79faf551c7285113248c0bd244b36405cffcc3683262db369e4fa01a55708',note:'공식 블로그 원본, 파일명 촬영일 기준; 원본 바이트 보존. 남쪽 위·아래 창 차이 확인, 수관 뒤 추정.'};
const munhyeong = facilities.find((facility) => facility.id === 'munhyeong')!;
munhyeong.focusSide = 'east';
munhyeong.photoUrl = '/references/munhyeong-20260604.jpg';
munhyeong.photoSourceUrl = 'https://m.blog.naver.com/aksblog/224304013123';
munhyeong.photoEvidence = {date:'2026-06-04',sha256:'f339a135a5842197551049b41b6f14aaa468af468591d6df9fd8665b56c7ba3e',note:'공식 출판문화부 인터뷰 게시일 기준. 남쪽동 동쪽 면. 북쪽동 동쪽 면은 2026-04-27 공식사진·항공으로 교차확인. 층고 미측량.'};
const jangseogak = facilities.find((facility) => facility.id === 'jangseogak')!;
// Architect north/sports-field photograph: recessed entry, landing, and a west-descending access flight.
// Plan offsets, step count and levels are estimates; terrain coupling must use the lower endpoint.
jangseogak.site = {access:{
  landing:{outline:[[3,12],[12,12],[12,27.6],[3,27.6]],elevation:3.1},
  stairs:{start:[3,26],end:[-9,26],width:3.2,steps:12,topHeight:3.1,bottomHeight:1.0},
  railHeight:0.9,
}};
const eastPond = facilities.find((facility) => facility.id === 'east-pond')!;
// Interior southern sample avoids the tree-lined northern bank; inferred low ground, not surveyed water level.
eastPond.groundSampleOffset = [0,-5];
const parking = facilities.find((facility) => facility.id === 'parking')!;
parking.focusSide = 'south';
// Lower paved forecourt supplies the entrance datum; upper field is an estimated retaining-wall step.
parking.groundSampleOffset = [7.5,-8];
const haku = facilities.find((facility) => facility.id === 'hakuijeong')!;
// Present the model's estimated access opening and observed plaque on selection.
haku.focusSide = 'east';
// Water must use the pond's low-ground datum rather than the northern bank/pavilion anchor.
// This offset is inside the interpreted shoreline; DEM height is approximate, not measured water level.
haku.groundSampleOffset = [-7,-12];
haku.description = '2024·2026년 연구원 공식 사진에서 현재의 사각 목조 정자, 출입구 바로 아래의 짧은 석재 발판 2개와 발판까지 이어지는 벽돌 포장 길을 확인했습니다. 정자 중심은 2021년 파노라마 촬영점과 위성 영상을 함께 해석한 위치이며, 발판 치수·높이와 연못 가장자리 윤곽·지형은 사진 비례 추정입니다. 실측 또는 측량 자료가 아닙니다.';
haku.site = {
  // Land reaches the eastern entry. The notch is interpreted from current photos, not a surveyed shore.
  water: {outline:[[-21,-20],[-24,-7],[-20,2],[-8,5],[2,4],[2.18,2.35],[2.18,-2.35],[5.1,-3],[9,-4],[10,-20],[0,-28],[-15,-26]],elevation:0.12,color:'#456f60'},
  steppedApproach: {
    start:[2.2,0],end:[2.9,0],floorElevation:1.65,
    // Two exposed treads BELOW the existing timber floor; no long bridge or added handrail.
    treads:[{depth:0.35,width:1.15,elevation:1.47},{depth:0.35,width:1.25,elevation:1.28}],
    paving:{outline:[[2.89,-1.25],[8,-1.25],[8,1.25],[2.89,1.25]],elevation:1.10,thickness:0.075},
    bank:{outline:[[2.18,-2.35],[5.1,-3],[8.9,-2.8],[10,1.8],[7,3.2],[2.18,2.35]],topElevation:1.025,bottomElevation:0.02,
      stoneEdges:[[[2.18,2.35],[2.18,-2.35]],[[2.18,-2.35],[5.1,-3]]]},
    sourceUrls:['https://blog.naver.com/aksblog/223408506698','https://blog.naver.com/aksblog/224263386724'],
    status:'photo-proportioned-estimate',
  },
};
export const geographicBuildings: GeographicBuilding[] = facilities.sort((a,b)=>a.officialNumber-b.officialNumber);
