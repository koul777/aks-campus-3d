import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts/upgrade-20261013',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const start=Date.now(),stages=[];let last='';
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:4173'}/?diagnostics=1`);
 const poll=setInterval(async()=>{
  try{const d=await page.evaluate(()=>window.__aksDiagnostics?.());if(d?.stage!==last){last=d?.stage;stages.push({stage:last,ms:Date.now()-start});}}catch{}
 },200);
 try{await page.waitForFunction(()=>window.__aksDiagnostics?.().stage==='displayed',null,{timeout:120000});}finally{clearInterval(poll);}
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).origin+new URL(r.name).pathname,duration:r.duration,bytes:r.transferSize})).sort((a,b)=>b.duration-a.duration).slice(0,15));
 const result={totalMs:Date.now()-start,stages,resources};
 console.log(JSON.stringify(result));await writeFile('artifacts/upgrade-20261013/startup.json',JSON.stringify(result,null,2));
}finally{await browser.close();}
