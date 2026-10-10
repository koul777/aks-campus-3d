/** Hakuijeong-only source-observed detail. All dimensions are modelling estimates, not survey data. */
export type PavilionDetailContract = {
  buildingId: string;
  enabledByDefault: boolean;
  sources: {url:string;file:string;sha256:string;observation:string}[];
  preserve: readonly string[];
  wood: {light:string;mid:string;shadow:string;deck:string;roughness:number;metalness:number};
  soffit: {suppressGenericFascia:boolean;backingThickness:number;recessFromEave:number;color:string};
  headBeams: {depth:number;width:number;topOffsetFromEave:number};
  capBeams: {depth:number;width:number;topOffsetFromEave:number};
  rafters: {perSide:number;radius:number;radialSegments:number;cornerFanCount:number;roofClearance:number};
  brackets: {perCorner:number;reach:number;depth:number;width:number};
  railing: {pattern:'rectangular-meander';moduleWidth:number;barWidth:number;panelHeight:number;preserveExistingRailHeights:boolean;gap:{deriveFrom:'existing-bridge-start';width:number;endPostWidth:number}};
  deck: {preserveTopAndThickness:boolean;edgeFasciaThickness:number;plankSeams:boolean};
  limits: readonly string[];
};

export const pavilionDetails: PavilionDetailContract = {
  buildingId:'hakuijeong',
  enabledByDefault:true,
  sources:[
    {url:'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/photo/hak/hak01.jpg',file:'references/research-20261010/panorama/photo/hak/hak01.jpg',sha256:'1ff2c692dcf1341464861daabeda53bfe911710a42c5112d45d2026d386ecced',observation:'Natural timber beam, rafters and shallow carved lintel; no painted dancheong bands.'},
    {url:'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/photo/hak/hak02.jpg',file:'references/research-20261010/panorama/photo/hak/hak02.jpg',sha256:'5553a557277466b42a482a24d53f7d1a668c9c8daa22ff23f2a6c6bdb05f864a',observation:'Same square pavilion: exposed rafters, corner supports, rectangular low rail panels and access opening.'},
    {url:'http://digerati.aks.ac.kr/DhLab/2021/101/HunHyeok/pavilion/photo/hak/hak03.jpg',file:'references/research-20261010/panorama/photo/hak/hak03.jpg',sha256:'fbb578b8d3694e7ef063e9401bb4e899d6a593aef08d154d348b16fc9da1f51b',observation:'Timber deck edge, low patterned railing, pale water piers. Exact per-still date unknown in 2021 project.'},
  ],
  preserve:['square footprint','roof pitch and envelope','building height','stilt geometry','platform top and thickness','existing bridge position and level','terrain and water datum'],
  wood:{light:'#A77B4F',mid:'#846143',shadow:'#574735',deck:'#80664D',roughness:0.88,metalness:0},
  soffit:{suppressGenericFascia:true,backingThickness:0.07,recessFromEave:0.36,color:'#846143'},
  headBeams:{depth:0.26,width:0.21,topOffsetFromEave:-0.22},
  capBeams:{depth:0.15,width:0.23,topOffsetFromEave:-0.06},
  rafters:{perSide:12,radius:0.07,radialSegments:8,cornerFanCount:3,roofClearance:0.08},
  brackets:{perCorner:2,reach:0.42,depth:0.12,width:0.16},
  railing:{pattern:'rectangular-meander',moduleWidth:0.42,barWidth:0.045,panelHeight:0.48,preserveExistingRailHeights:true,gap:{deriveFrom:'existing-bridge-start',width:1.25,endPostWidth:0.10}},
  deck:{preserveTopAndThickness:true,edgeFasciaThickness:0.055,plankSeams:false},
  limits:[
    'Not the earlier hexagonal pavilion; restrict to Hakuijeong square geometry.',
    'Rafter counts, dimensions, bracket simplification and railing module are estimates.',
    'Derive beams from existing posts and rafter endpoints from actual roof underside; never penetrate or enlarge the roof envelope.',
    'Keep short brackets schematic; no invented floral/animal carving, hidden joinery or multicolour painted bands.',
    'Access gap follows the existing estimated bridge contact; it is not a surveyed cardinal assignment.',
    'Photo materials are reference-only; do not use AKS photos as runtime textures.',
    'Default detail geometry is authorized; any downloaded grain material remains opt-in until actual A/B inspection.',
  ],
};

/** One optional CC0 grain candidate; geometry default and texture acceptance are independent. */
export const hakuWoodMaterialTrial = {
  id:'ambientcg-wood096-1k',
  enabledByDefault:false,
  scope:'hakuijeong-timber-only',
  source:'https://ambientcg.com/a/Wood096',
  license:'CC0-1.0',
  licenseUrl:'https://docs.ambientcg.com/license/',
  manifest:'/materials/haku-wood096/manifest.json',
  diffuse:'/materials/haku-wood096/Wood096_1K-JPG_Color.jpg',
  normalGL:'/materials/haku-wood096/Wood096_1K-JPG_NormalGL.jpg',
  totalBytes:1778839,
  roughness:0.88,
  metalness:0,
  normalScale:0.12,
  grainAxisInImage:'v',
  alignment:'Grain follows each beam/post/rafter long axis; rotate UV for horizontal beams rather than stretching world coordinates.',
  limits:'Asset says natural softwood, not identified Haku timber species. Source diffuse/normal files are unchanged. Original roughness is research-only to keep runtime maps below2MB. Reject glossy coated/plank-grid/large-knot/rotated-grain appearance. Require actual same-camera A/B before default.',
} as const;
