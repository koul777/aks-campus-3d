import { readFile,writeFile,mkdir } from 'node:fs/promises';
import ts from 'typescript';
import { BufferGeometry,Float32BufferAttribute,Vector3 } from 'three';
import assert from 'node:assert/strict';
await mkdir('artifacts/photo-projection',{recursive:true});
const code=ts.transpileModule(await readFile('src/photo-patch-model.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
await writeFile('artifacts/photo-projection/helper.mjs',code);
const {solvePhotoHomography,subtractPhotoRegion}=await import('../artifacts/photo-projection/helper.mjs');
// Independent synthetic camera: known non-affine projective coefficients.
const expected=[300,20,100,-10,200,50,.15,-.08];
const project=(h,u,v)=>[(h[0]*u+h[1]*v+h[2])/(h[6]*u+h[7]*v+1),(h[3]*u+h[4]*v+h[5])/(h[6]*u+h[7]*v+1)];
const h=solvePhotoHomography([[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>project(expected,u,v)));
let maximumError=0;
for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){
  const a=project(expected,i/10,j/10),b=project(h,i/10,j/10);
  maximumError=Math.max(maximumError,Math.hypot(a[0]-b[0],a[1]-b[1]));
}
assert(maximumError<1e-9);
// A 2x2 planar wall minus central 1x1 receiver must retain exactly 3 square metres.
const geometry=new BufferGeometry();
geometry.setAttribute('position',new Float32BufferAttribute([0,0,0,2,0,0,2,2,0,0,0,0,2,2,0,0,2,0],3));
geometry.computeVertexNormals();
const patch={side:'south',geometryCorners:[[.5,0,1.5],[1.5,0,1.5],[1.5,0,.5],[.5,0,.5]]};
const result=subtractPhotoRegion(geometry,patch,0),positions=result.getAttribute('position');
let area=0;
for(let i=0;i<positions.count;i+=3){
  const a=new Vector3().fromBufferAttribute(positions,i),b=new Vector3().fromBufferAttribute(positions,i+1),c=new Vector3().fromBufferAttribute(positions,i+2);
  area+=b.sub(a).cross(c.sub(a)).length()/2;
}
assert(Math.abs(area-3)<1e-6);
const report={maximumReprojectionErrorPixels:maximumError,retainedAreaSquareMetres:area,expectedAreaSquareMetres:3};
await writeFile('artifacts/photo-projection/result.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
