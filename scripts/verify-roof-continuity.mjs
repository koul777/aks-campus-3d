import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
import {Vector3} from 'three';
import assert from 'node:assert/strict';
await mkdir('artifacts/roof-continuity',{recursive:true});
const code=ts.transpileModule(await readFile('src/roof-uv.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
await writeFile('artifacts/roof-continuity/helper.mjs',code);
const {createRoofFrames,roofMetricUv}=await import('../artifacts/roof-continuity/helper.mjs');
// Analytic 45-degree plane. Two triangles share a diagonal; the curved strip
// boundary has independent duplicate vertices at the same physical eave.
const corners=[[-2,-1],[2,-1],[2,1],[-2,1]];
const a=[-2,0,1],b=[2,0,1],c=[2,1,0],d=[-2,1,0];
const {frames,faceIndices}=createRoofFrames(corners,0,[...a,...b,...c,...a,...c,...d]);
assert.equal(faceIndices[0],faceIndices[3]);
const frame=frames[faceIndices[0]];
let maximumSeamError=0;
for(let i=0;i<=10;i++){
  const position=new Vector3(-2+4*i/10,0,1);
  const main=roofMetricUv(position,frames[faceIndices[0]]),rim=roofMetricUv(position.clone(),frames[0]);
  maximumSeamError=Math.max(maximumSeamError,Math.hypot(main[0]-rim[0],main[1]-rim[1]));
}
assert(maximumSeamError<1e-12);
const initial=roofMetricUv(new Vector3(0,0,1),frame);
const along=roofMetricUv(new Vector3(.33,0,1),frame);
const slope=roofMetricUv(new Vector3(0,.34/Math.sqrt(2),1-.34/Math.sqrt(2)),frame);
assert(Math.abs(along[0]-initial[0]-1)<1e-12);
assert(Math.abs(slope[1]-initial[1]-1)<1e-12);
const report={maximumSeamErrorUV:maximumSeamError,alongModuleMetres:.33,slopeModuleMetres:.34,faceIndices};
await writeFile('artifacts/roof-continuity/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
