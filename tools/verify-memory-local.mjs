import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
assert.ok(process.env.PLAYWRIGHT_MODULE, 'Đặt PLAYWRIGHT_MODULE tới index.mjs của playwright-core đã cài.');
assert.equal(process.platform, 'win32', 'Bộ giám sát PowerShell này dành cho Windows.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=resolve('dist'), output=resolve(process.env.EVIDENCE_DIR || 'docs/memory-evidence');
await mkdir(output,{recursive:true});
const errors=[],samples=[];
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1)));
  if(!file.startsWith(root+sep))throw Error('outside');
  let body=await readFile(file);
  if(file.endsWith('.js')){
   const text=body.toString();
   assert.ok(text.includes('startLoop(){'),'có điểm gắn bộ đo chỉ trên server kiểm thử');
   body=Buffer.from(text.replace('startLoop(){','startLoop(){globalThis.__testEngine=this;'));
  }
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let bs,browser,watchdog;
try{
 bs=await chromium.launchServer({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-extensions','--disable-background-networking'],timeout:25000});
 browser=await chromium.connect(bs.wsEndpoint());
 const pid=bs.process().pid;
 const guardPath=resolve(output,'system-memory.jsonl');
 await writeFile(guardPath,'');
 const escaped=guardPath.replaceAll("'","''");
 const command=`$ErrorActionPreference='Stop';1..160 | ForEach-Object {$m=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; $sample=@{at=(Get-Date -Format o);freeMB=$m.AvailableMBytes;commitPercent=$m.PercentCommittedBytesInUse};($sample|ConvertTo-Json -Compress)|Add-Content -LiteralPath '${escaped}';if($m.AvailableMBytes -lt 1500 -or $m.PercentCommittedBytesInUse -ge 78){taskkill.exe /PID ${pid} /T /F;exit 2};Start-Sleep -Seconds 2}`;
 watchdog=spawn('powershell',['-NoProfile','-Command',command],{stdio:'ignore',windowsHide:true});
 const context=await browser.newContext({viewport:{width:1100,height:720},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await page.goto(origin,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>globalThis.__testEngine?.renderer?.info?.render?.frame>1,{timeout:20000});
 console.log('BUTTONS',JSON.stringify(await page.locator('button').allTextContents()));
 console.log('INITIAL',JSON.stringify(await page.evaluate(()=>{const e=globalThis.__testEngine;return {software:e.isSoftwareGl,low:e.lowEndGpu,phase:e.phase,memory:e.renderer.info.memory,frame:e.renderer.info.render.frame,quality:e.graphicsQuality}})));
 const duration=Number(process.env.DURATION_MS||15000);
 if(process.env.FULL_RUN==='1'){
  const entry=page.getByRole('button',{name:/CHẠM ĐỂ VÀO GAME/i}).first();
  if(await entry.count())await entry.click();
  const skip=page.getByRole('button',{name:'Bỏ qua hướng dẫn'});
  if(await skip.count())await skip.click();
  await page.getByRole('button',{name:/CHIẾN ĐẤU/}).first().click();
  await page.waitForFunction(()=>globalThis.__testEngine.phase==='PLAYING');
  console.log('STARTED_VIA_UI');
  // Chỉ tăng HP trong fixture để quan sát đủ 3 phút; không thay save thật.
  await page.evaluate(()=>{const e=globalThis.__testEngine;e.hp=e.maxHp=1000000;});
 }
 const start=Date.now();
 while(Date.now()-start<duration){
  await page.waitForTimeout(5000);
  const item=await page.evaluate(()=>{const e=globalThis.__testEngine;return {at:Date.now(),frame:e.renderer.info.render.frame,phase:e.phase,geometries:e.renderer.info.memory.geometries,textures:e.renderer.info.memory.textures,programs:e.renderer.info.programs.length,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null,enemies:e.enemies.length,kills:e.kills,hp:e.hp,stage:e.stageIndex,elapsed:e.runElapsedSeconds,drawCalls:e.renderer.info.render.calls,pending:!!e.pendingGpuSync};});
  if(process.env.FULL_RUN==='1')await page.evaluate(()=>{
    const e=globalThis.__testEngine;
    if(String(e.phase).includes('DRAFT')){e.applySkillChoice('atk_boost');e.resumeFromDraft();}
    if(e.portalOpen){e.px=0;e.pz=-11.5;}
  });
  samples.push(item);console.log('SAMPLE',JSON.stringify(item));
  await writeFile(resolve(output,'runtime.json'),JSON.stringify({errors,samples},null,2));
 }
 if(process.env.FULL_RUN==='1'){
  const lost = await page.evaluate(()=>{
    const e=globalThis.__testEngine;
    const extension=e.renderer.getContext().getExtension('WEBGL_lose_context');
    if(!extension)return false;
    globalThis.__restoreGpu=()=>extension.restoreContext();
    extension.loseContext();return true;
  });
  assert.ok(lost, 'Chrome thử nghiệm hỗ trợ kiểm tra mất context');
  await page.waitForFunction(()=>globalThis.__testEngine.contextLost);
  const stopped=await page.evaluate(()=>globalThis.__testEngine.elapsed);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>globalThis.__testEngine.elapsed),stopped);
  await page.evaluate(()=>globalThis.__restoreGpu());
  await page.waitForFunction(()=>!globalThis.__testEngine.contextLost&&globalThis.__testEngine.renderer.info.render.frame>2);
  const frame=await page.evaluate(()=>globalThis.__testEngine.renderer.info.render.frame);
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(before=>globalThis.__testEngine.renderer.info.render.frame>before,frame));
  await writeFile(resolve(output,'context-recovery.json'),JSON.stringify({passed:true,stoppedElapsed:stopped},null,2));
  console.log('CONTEXT_RECOVERY_PASS');
  // Kiểm tra churn model/phòng ngay trên WebGL thật, chỉ trong fixture cục bộ.
  const churn=await page.evaluate(async()=>{
   const e=globalThis.__testEngine;e.setPhase('TITLE');
   const counts=[];
   for(let i=0;i<12;i++){
    e.updateLoadoutAppearance({...e.baseStats},{...e.heroVisualCfg,weaponAccentHex:i%2?0x38bdf8:0xfbbf24});
    e.selectChapterPreview(i%2+1);
    await new Promise(r=>setTimeout(r,350));
    counts.push({...e.renderer.info.memory});
   }
   return counts;
  });
  console.log('CHURN',JSON.stringify(churn));
  await writeFile(resolve(output,'churn.json'),JSON.stringify(churn,null,2));
  assert.ok(Math.max(...churn.map(x=>x.geometries))-Math.min(...churn.map(x=>x.geometries))<100,'tài nguyên không tăng vô hạn sau đổi model/map');
 }
 assert.equal(errors.length,0,errors.join('\n'));
 assert.ok(samples.at(-1).frame>samples[0].frame,'render loop phải còn sống');
 console.log('PASS',samples.length,'samples');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(bs)await bs.close().catch(()=>{});
 if(watchdog)watchdog.kill();
 await new Promise(r=>server.close(r));
}
