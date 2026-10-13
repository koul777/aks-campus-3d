import { geographicBuildings } from '../src/data/geographic-buildings.ts';
import { writeFile } from 'node:fs/promises';
const polygons=geographicBuildings.filter(b=>!['pond','underground-parking'].includes(b.kind)).flatMap(b=>b.parts.map(p=>{
 const t=b.rotationDegrees*Math.PI/180,c=Math.cos(t),s=Math.sin(t),lonScale=111320*Math.cos(b.anchor.latitude*Math.PI/180);
 return {id:b.id,part:p.id,coordinates:p.footprint.map(([e,n])=>[b.anchor.longitude+(e*c-n*s)/lonScale,b.anchor.latitude+(e*s+n*c)/111000])};
}));
await writeFile('references/surroundings-20261013/campus-footprints.json',JSON.stringify(polygons));
console.log(`Exported ${polygons.length} campus footprints`);
