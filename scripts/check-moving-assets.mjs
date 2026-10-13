import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('artifacts/upgrade-20261013',{recursive:true});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5173'}/scripts/fixtures/moving-inspector.html`);
 await page.waitForFunction(()=>window.qa,null,{timeout:45000});
 const result=await page.evaluate(()=>window.qa);
 assert.deepEqual(errors,[]);
 for(const person of result.results){assert(person.minFoot>=-.005);assert(person.maxFoot<.07);}
 const b=result.carBounds;assert(b.max.x-b.min.x<=2.2);assert(b.max.z-b.min.z<=4.8);
 await page.screenshot({path:'artifacts/upgrade-20261013/moving-inspection.png'});
 await writeFile('artifacts/upgrade-20261013/moving-inspection.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
