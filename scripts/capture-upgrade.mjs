import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const stage = process.argv[2] || 'current';
const output = `artifacts/upgrade-20261013/${stage}`;
await mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:'chrome', headless:true});
const page = await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
  await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5173'}/?diagnostics=1`, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__aksDiagnostics?.().stage==='displayed',undefined,{timeout:120000});
  await page.waitForTimeout(2500);
  await page.screenshot({path:`${output}/overview.png`});
  for (const [id,heading,pitch,range] of [['main',15.5,-18,105],['graduate-school',15.5,-20,110],['gate',15.5,-35,200]]) {
    await page.evaluate(([id,h,p,r])=>window.__aksViewFacility(id,h,p,r),[id,heading,pitch,range]);
    await page.waitForTimeout(3500);
    await page.screenshot({path:`${output}/${id}.png`});
  }
  if(stage!=='baseline'){
    for(const [label,name] of [['주변 보기','neighborhood'],['산책길 보기','walkers'],['버스 보기','bus']]){
      await page.getByRole('button',{name:label,exact:true}).click();
      await page.waitForTimeout(4000);
      await page.screenshot({path:`${output}/${name}.png`});
      await page.waitForTimeout(1000);
      await page.screenshot({path:`${output}/${name}-later.png`});
    }
  }
  await writeFile(`${output}/runtime.json`, JSON.stringify({diagnostics:await page.evaluate(()=>window.__aksDiagnostics()),errors},null,2));
  console.log(JSON.stringify({stage,errors,output}));
} finally { await browser.close(); }
