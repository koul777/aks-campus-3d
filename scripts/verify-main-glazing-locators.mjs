import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
await mkdir('artifacts/main-glazing-locators',{recursive:true});
for(const name of ['geographic-buildings','main-glazing']){
 const code=ts.transpileModule(await readFile(`src/data/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 await writeFile(`artifacts/main-glazing-locators/${name}.mjs`,code);
}
const {geographicBuildings}=await import('../artifacts/main-glazing-locators/geographic-buildings.mjs');
const {mainGlazingSamples}=await import('../artifacts/main-glazing-locators/main-glazing.mjs');
assert.equal(mainGlazingSamples.length,5);
const matches=mainGlazingSamples.map(sample=>{
 const part=geographicBuildings.find(building=>building.id===sample.buildingId).parts.find(part=>part.id===sample.partId);
 const openings=part.glazedOpenings.filter(opening=>opening.side===sample.side&&opening.center===sample.center&&opening.bottom===sample.bottom);
 assert.equal(openings.length,1,`ambiguous or missing locator ${sample.id}`);
 assert.equal(openings[0].bottom,5.35);
 return {id:sample.id,center:sample.center,bottom:sample.bottom,matches:openings.length};
});
await writeFile('artifacts/main-glazing-locators/result.json',JSON.stringify(matches,null,2));console.log(JSON.stringify(matches));
