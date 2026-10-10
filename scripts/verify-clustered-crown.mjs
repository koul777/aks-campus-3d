import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
import {Vector3} from 'three';
import assert from 'node:assert/strict';
await mkdir('artifacts/clustered-crown',{recursive:true});
const code=ts.transpileModule(await readFile('src/clustered-crown.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
await writeFile('artifacts/clustered-crown/helper.mjs',code);
const {createClusteredCrown}=await import('../artifacts/clustered-crown/helper.mjs');
const instances=[['west-large',6.5,5.2,false],['east-large',6.4,5,false],['west-small',3.6,3.4,true],['east-small',3.8,3.5,true]].map(([id,height,crownDiameter,small])=>({id,height,crownDiameter,small,translation:[0,2,0]}));
const report=[];
for(const instance of instances){
 const crown=createClusteredCrown(instance),min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
 for(const geometry of crown.geometries){
  geometry.computeBoundingBox();min.min(geometry.boundingBox.min);max.max(geometry.boundingBox.max);
  for(const attribute of Object.values(geometry.attributes))for(const value of attribute.array)assert(Number.isFinite(value));
  const normal=geometry.getAttribute('normal');for(let i=0;i<normal.count;i++)assert(Math.abs(new Vector3().fromBufferAttribute(normal,i).length()-1)<1e-5);
  geometry.dispose();
 }
 assert(Math.abs(max.x-min.x-instance.crownDiameter)<1e-5);assert(Math.abs(max.y-2-instance.height)<1e-5);
 assert.equal(crown.clusters,instance.small?240:410);
 report.push({id:instance.id,clusters:crown.clusters,triangles:crown.triangles,width:max.x-min.x,heightAboveDatum:max.y-2});
}
await writeFile('artifacts/clustered-crown/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
