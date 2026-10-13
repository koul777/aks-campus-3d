import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const output='docs/images';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1500,height:950},reducedMotion:'reduce'});
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:4173'}/?diagnostics=1`);
 await page.waitForFunction(()=>window.__aksDiagnostics?.().stage==='displayed',null,{timeout:120000});
 for(const [label,name] of [['주변 보기','neighborhood'],['산책길 보기','walkers'],['버스 보기','bus']]){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.waitForTimeout(2000);
  await page.waitForFunction(()=>window.__aksDiagnostics().globeTilesLoaded,null,{timeout:30000});
  await page.screenshot({path:`${output}/${name}-20261013.jpg`,type:'jpeg',quality:86});
 }
}finally{await browser.close();}
