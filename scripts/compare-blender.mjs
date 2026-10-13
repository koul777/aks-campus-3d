import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output='artifacts/upgrade-20261013/blender-comparison';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const mode of ['legacy','refined']){
  const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:5173/?diagnostics=1&blender=${mode}`);
  await page.waitForFunction(()=>window.__aksDiagnostics?.().stage==='displayed',null,{timeout:120000});
  for(const [id,h,p,r] of [['main',15.5,-8,92],['hall',35,-20,112],['library',-10,-22,105],['jangseogak',-25,-22,112]]){
   await page.evaluate(([id,h,p,r])=>window.__aksViewFacility(id,h,p,r),[id,h,p,r]);
   await page.waitForTimeout(2200);await page.screenshot({path:`${output}/${id}-${mode}.png`});
  }
  await writeFile(`${output}/${mode}.json`,JSON.stringify({diagnostics:await page.evaluate(()=>window.__aksDiagnostics()),errors},null,2));
  await page.close();console.log(`${mode} complete`);
 }
}finally{await browser.close();}
