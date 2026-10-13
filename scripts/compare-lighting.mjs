import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const out='artifacts/upgrade-20261013/lighting';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
try{
 await page.goto('http://127.0.0.1:5173/?diagnostics=1');
 await page.waitForFunction(()=>window.__aksDiagnostics?.().stage==='displayed',null,{timeout:120000});
 await page.evaluate(()=>window.__aksViewFacility('main',15.5,-8,92));await page.waitForTimeout(4000);
 await page.screenshot({path:`${out}/cast.png`});
 await page.evaluate(()=>window.__aksSetModelShadowMode('enabled'));await page.waitForTimeout(1000);
 await page.screenshot({path:`${out}/self-shadow.png`});
 await page.evaluate(()=>window.__aksSetShadowSettings(4096,1300));await page.waitForTimeout(1000);
 await page.screenshot({path:`${out}/self-shadow-4096.png`});
 await writeFile(`${out}/diagnostics.json`,JSON.stringify(await page.evaluate(()=>window.__aksDiagnostics()),null,2));
 console.log('lighting comparison complete');
}finally{await browser.close();}
