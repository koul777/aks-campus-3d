// CPU acceptance checks against emitted geometry and the real site-grade functions.
// These checks do not establish rendered quality or survey accuracy.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';

const directory='artifacts/haku-short-access';
await mkdir(`${directory}/data`,{recursive:true});
for(const name of ['haku-access-model','terrain-grading','data/geographic-buildings','data/site-grading']){
  const code=ts.transpileModule(await readFile(`src/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
    .replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g,'$1$2.mjs$3');
  await writeFile(`${directory}/${name}.mjs`,code);
}
const {addHakuSteppedApproach}=await import(`../${directory}/haku-access-model.mjs`);
const {geographicBuildings}=await import(`../${directory}/data/geographic-buildings.mjs`);
const {gradePhotoSiteHeight,gradeShorelineHeight,localToGeographic}=await import(`../${directory}/terrain-grading.mjs`);
const building=geographicBuildings.find(b=>b.id==='hakuijeong'),access=building.site.steppedApproach;
assert.equal(building.site.bridge,undefined,'Unsupported long slab removed');
const group=new Group();addHakuSteppedApproach(group,access);group.updateMatrixWorld(true);
const meshes=group.children.filter(m=>m instanceof Mesh),ray=new Raycaster();
const at=(e,n,names)=>{ray.set(new Vector3(e,5,-n),new Vector3(0,-1,0));return ray.intersectObjects(names?meshes.filter(m=>names.includes(m.name)):meshes,false)[0]?.point.y;};
const near=(a,b,detail)=>assert(Math.abs(a-b)<1e-6,`${detail}: ${a} vs ${b}`);
const treads=meshes.filter(m=>m.name.startsWith('haku-stone-tread-'));
assert.equal(treads.length,2);
const bounds=treads.map(m=>new Box3().setFromObject(m));
near(bounds[0].min.x,2.195,'Upper block physically overlaps floor edge by 5 mm');
near(bounds[0].max.y,1.47,'Upper tread below floor');
near(bounds[1].max.y,1.28,'Lower tread separately exposed');
near(bounds[0].min.y,access.bank.topElevation,'Upper tread supported by bank');
near(bounds[1].min.y,access.bank.topElevation,'Lower tread supported by bank');
assert(bounds[0].max.x>=bounds[1].min.x,'Stone treads have no plan gap');
near(bounds[0].max.z-bounds[0].min.z,1.15,'Narrower upper width');
near(bounds[1].max.z-bounds[1].min.z,1.25,'Lower width');
near(at(2.375,0,['haku-stone-tread-1']),1.47,'Actual center ray hits upper top');
near(at(2.725,0,['haku-stone-tread-2']),1.28,'Actual center ray hits lower top');
near(at(3.1,0,['haku-brick-approach']),1.10,'Brick walking plane meets lower foot');
const bank=meshes.find(m=>m.name==='haku-landward-bank'),paving=meshes.find(m=>m.name==='haku-brick-approach');
const bankBounds=new Box3().setFromObject(bank),pavingBounds=new Box3().setFromObject(paving);
near(bankBounds.max.y,pavingBounds.min.y,'Paving underside has solid earth contact');
let supportCornerChecks=0;
for(const [label,box] of [['upper tread',bounds[0]],['lower tread',bounds[1]],['paving',pavingBounds]]){
  for(const e of [box.min.x+1e-5,box.max.x-1e-5])for(const z of [box.min.z+1e-5,box.max.z-1e-5]){
    near(at(e,-z,['haku-landward-bank']),access.bank.topElevation,`${label} corner has actual supporting earth triangle`);
    supportCornerChecks++;
  }
}
assert.equal(at(4,2,['haku-landward-bank']),undefined,'Broad shoulders are terrain, not a flat soil polygon');
near(bankBounds.min.x,2.18,'Narrow support western contact');
near(bankBounds.max.x,8.02,'Narrow support terminal overlap');
near(bankBounds.max.z-bankBounds.min.z,2.62,'Support covers paving with only small shoulders');
const facing=meshes.find(m=>m.name==='haku-pond-bank-stones'),facingBounds=new Box3().setFromObject(facing);
assert(facingBounds.min.x>bankBounds.min.x,'Stone proxy is recessed landward, not projecting offshore');
assert(facingBounds.min.z>-1.6&&facingBounds.max.z<1.6,'Stone proxy stays clear of corner pier axes at n±2.2');
assert(pavingBounds.min.x<=bounds[1].max.x,'Paving overlaps lower step by at least 5 mm');
assert(at(4,0)<1.11,'Former bridge corridor is now lower brick approach');
const datums=new Map([[building.id,0]]),waters=new Map([[building.id,building.site.water.elevation]]);
const ground=(point,source=5)=>{
  const p=localToGeographic(building,point);
  const shore=gradeShorelineHeight(p.longitude,p.latitude,source,waters);
  return {shore,final:gradePhotoSiteHeight(p.longitude,p.latitude,shore,datums,19)};
};
for(const point of [[0,0],[-2.2,-2.2],[-2.2,2.2],[1.9,0],[2.0,-2.2]]){
  const h=ground(point);near(h.final,h.shore,`Water-side bed unchanged at ${point}`);
  assert(h.final<=building.site.water.elevation,'Pond-side ground remains below water');
}
const bankChecks=[[2.3,0],[2.9,0],[4,0],[7,1]].map(point=>({point,...ground(point)}));
for(const {final} of bankChecks)near(final,access.bank.topElevation,'Dry bank core has the paving underside grade');
const outside=ground([20,15]);near(outside.final,5,'Bounded patch rejoins original terrain');
// Existing floor, roof and pavilion parts stay byte-equivalent to the preserved
// pre-access CPU data snapshot. This deliberately ignores unrelated facilities.
const {geographicBuildings:before}=await import('../artifacts/haku-geometry-compact/data/geographic-buildings.mjs');
assert.deepEqual(building.parts,before.find(b=>b.id==='hakuijeong').parts);
near(building.parts[0].baseHeight+0.35,access.floorElevation,'Preserved floor top');
const report={
  status:'photo-proportioned-estimate',visibleStoneTreads:2,runMetres:0.70,
  elevations:{preservedFloor:1.65,upperTread:1.47,lowerTread:1.28,paving:1.10,bankTop:1.025,water:0.12},
  risesMetres:[0.18,0.19,0.18],widthsMetres:[1.15,1.25],pavingWidthMetres:2.5,
  floorOverlapMetres:0.005,pavingToBankVerticalGapMetres:0,supportCornerChecks,
  supportFootprint:{west:bankBounds.min.x,east:bankBounds.max.x,width:bankBounds.max.z-bankBounds.min.z},
  broadFlatShouldersRemoved:true,stoneFacingRecessedAndClearOfCornerPiers:true,
  sourceSupportedCases:['two separately visible stone treads below floor','square access axis','brick paving reaches lower stone foot','no long slab','solid bank/paving contact','pond-side bed unaffected by landward grade','existing pavilion parts preserved'],
  bankChecks,meshCount:meshes.length,triangleCount:meshes.reduce((sum,m)=>sum+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),
  limitation:'CPU geometry and pointwise estimated terrain checks; current camera render, coarse terrain interpolation and shore silhouette still require coordinator visual inspection. Absolute dimensions and grades are not surveyed.',
};
await writeFile(`${directory}/result.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
