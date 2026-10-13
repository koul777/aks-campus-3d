import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output='artifacts/upgrade-20261013/packed-comparison';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const mode of ['procedural','packed']){
  const page=await browser.newPage({viewport:{width:1500,height:950},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:5173/?diagnostics=1&models=${mode}`);
  await page.waitForFunction(()=>window.__aksDiagnostics?.().stage==='displayed',null,{timeout:120000});
  for(const [id,h,p,r] of [['hakuijeong',195,-17,30],['east-pond',15.5,-25,70],['gugeun',100,-15,55],['munhyeong',100,-20,92],['graduate-school',15.5,-15,86],['gate',15.5,-24,65]]){
   await page.evaluate(([id,h,p,r])=>window.__aksViewFacility(id,h,p,r),[id,h,p,r]);await page.waitForTimeout(2000);
   await page.screenshot({path:`${output}/${id}-${mode}.png`});
  }
  await writeFile(`${output}/${mode}.json`,JSON.stringify({diagnostics:await page.evaluate(()=>window.__aksDiagnostics()),errors},null,2));
  await page.close();console.log(`${mode} captured`);
 }
}finally{await browser.close();}
