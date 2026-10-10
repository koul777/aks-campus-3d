import { BoxGeometry, ExtrudeGeometry, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, Shape, Vector2, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LocalPoint, SteppedApproach } from './data/geographic-buildings';

/** Current photo-proportioned access. Absolute dimensions and shore grades are estimates. */
export function addHakuSteppedApproach(group:Group, access:SteppedApproach) {
  const stone=new MeshStandardMaterial({color:'#b4b1a5',roughness:0.98});
  const soil=new MeshStandardMaterial({color:'#756d50',roughness:1});
  const bankStone=new MeshStandardMaterial({color:'#777568',roughness:1});
  const paving=new MeshStandardMaterial({color:'#a99782',roughness:0.96});
  const mortar=new MeshStandardMaterial({color:'#786e5d',roughness:1});
  const solid=(name:string,outline:LocalPoint[],top:number,bottom:number,material:MeshStandardMaterial)=>{
    const geometry=new ExtrudeGeometry(new Shape(outline.map(([e,n])=>new Vector2(e,n))),{depth:top-bottom,bevelEnabled:false});
    geometry.rotateX(-Math.PI/2);
    geometry.translate(0,bottom,0);
    const mesh=new Mesh(geometry,material);
    mesh.name=name;mesh.userData.hakuAccess=true;group.add(mesh);return mesh;
  };
  // Support only the paving/treads; broad shoulders retain the graded terrain
  // and its aerial imagery instead of becoming a flat colored platform.
  const pavingEs=access.paving.outline.map(p=>p[0]),pavingNs=access.paving.outline.map(p=>p[1]);
  const supportWest=Math.min(access.start[0],...pavingEs)-0.02;
  const supportEast=Math.max(access.end[0],...pavingEs)+0.02;
  const supportHalfWidth=Math.max(...pavingNs.map(Math.abs),...access.treads.map(t=>t.width/2))+0.06;
  const supportOutline:LocalPoint[]=[[supportWest,-supportHalfWidth],[supportEast,-supportHalfWidth],[supportEast,supportHalfWidth],[supportWest,supportHalfWidth]];
  solid('haku-landward-bank',supportOutline,access.bank.topElevation,access.bank.bottomElevation,soil);
  solid('haku-brick-approach',access.paving.outline,access.paving.elevation,access.paving.elevation-access.paving.thickness,paving);
  const direction=new Vector3(access.end[0]-access.start[0],0,-(access.end[1]-access.start[1])).normalize();
  let travel=0;
  access.treads.forEach((tread,index)=>{
    // All stone blocks sit on the landward bank; their tops are below the floor.
    const bottom=access.bank.topElevation;
    const mesh=new Mesh(new BoxGeometry(tread.depth+0.01,tread.elevation-bottom,tread.width),stone);
    mesh.position.set(access.start[0]+direction.x*(travel+tread.depth/2),bottom+(tread.elevation-bottom)/2,-access.start[1]+direction.z*(travel+tread.depth/2));
    mesh.quaternion.setFromUnitVectors(new Vector3(1,0,0),direction);
    mesh.name=`haku-stone-tread-${index+1}`;mesh.userData.hakuAccess=true;group.add(mesh);
    travel+=tread.depth;
  });
  // Shallow staggered mortar joints describe brick paving without importing a
  // photographic texture or multiplying draw calls. Brick size is an estimate.
  const es=access.paving.outline.map(p=>p[0]),ns=access.paving.outline.map(p=>p[1]);
  const minE=Math.min(...es),maxE=Math.max(...es),minN=Math.min(...ns),maxN=Math.max(...ns);
  const joints:BoxGeometry[]=[];
  const joint=(e:number,n:number,length:number,width:number)=>{
    const geometry=new BoxGeometry(length,0.003,width);
    geometry.translate(e,access.paving.elevation+0.001,-n);joints.push(geometry);
  };
  for(let row=0,n=minN;n<=maxN+1e-8;row++,n+=0.15){
    joint((minE+maxE)/2,Math.min(n,maxN),maxE-minE,0.008);
    if(n+0.15>maxN)continue;
    for(let e=minE+(row%2)*0.15;e<maxE;e+=0.30)joint(e,n+0.075,0.008,0.15);
  }
  const jointGeometry=mergeGeometries(joints);
  joints.forEach(g=>g.dispose());
  if(jointGeometry){const mesh=new Mesh(jointGeometry,mortar);mesh.name='haku-brick-joints';mesh.userData.hakuAccess=true;group.add(mesh);}
  // Low irregular masonry faces the pond, as seen in the opposite-bank source.
  // This is a bounded stone-bank proxy, not a claim of individual stone survey.
  const stones:IcosahedronGeometry[]=[];
  // A short recessed facing is kept beneath the entrance only. It stops short
  // of the pale corner piers; the broader shoreline uses the terrain shoulders.
  const facingEdges:[LocalPoint,LocalPoint][]=[[[supportWest,supportHalfWidth],[supportWest,-supportHalfWidth]]];
  facingEdges.forEach(([a,b],edgeIndex)=>{
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/0.40);
    const de=(b[0]-a[0])/length,dn=(b[1]-a[1])/length;
    const insetE=-dn*0.20,insetN=de*0.20;
    for(let row=0;row<3;row++)for(let i=0;i<count;i++){
      const t=(i+0.5)/count,phase=(i*17+row*13+edgeIndex*7)%11;
      const geometry=new IcosahedronGeometry(1,0);
      geometry.scale(0.22+phase*0.006,0.17+phase*0.003,0.065);
      geometry.rotateY(Math.atan2(dn,de));
      geometry.translate(a[0]+(b[0]-a[0])*t+insetE,access.bank.bottomElevation+0.17+row*0.31,-a[1]-(b[1]-a[1])*t-insetN);
      stones.push(geometry);
    }
  });
  const stoneGeometry=mergeGeometries(stones);stones.forEach(g=>g.dispose());
  if(stoneGeometry){const mesh=new Mesh(stoneGeometry,bankStone);mesh.name='haku-pond-bank-stones';mesh.userData.hakuAccess=true;group.add(mesh);}
  group.userData.hakuAccess={status:access.status,treadCount:access.treads.length,run:travel,floorElevation:access.floorElevation,pavingElevation:access.paving.elevation};
}
