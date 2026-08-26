const{chromium}=require('playwright');
const fs=require('node:fs');

const base=process.env.NEKOPOLIS_URL||'http://127.0.0.1:5180';
const windowsChrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath=process.env.NEKOPOLIS_BROWSER_PATH||(process.platform==='win32'&&fs.existsSync(windowsChrome)?windowsChrome:undefined);

async function waitForAudio(page){
 await page.waitForFunction(()=>{const d=window.nekopolisAudioDebug?.();return d?.buffers===8&&d.musicStarted&&d.contextState==='running'},{timeout:15_000});
 return page.evaluate(()=>window.nekopolisAudioDebug?.());
}

(async()=>{
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 await context.addInitScript(()=>localStorage.removeItem('nekopolis-audio-settings'));
 const failures=[],consoleErrors=[];
 const track=page=>{
  page.on('requestfailed',r=>failures.push(`${r.method()} ${r.url()} ${r.failure()?.errorText||''}`));
  page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});
  page.on('pageerror',e=>consoleErrors.push(`page ${page.url()}: ${e.stack||e.message}`));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(`console: ${m.text()}`)});
 };

 const two=await context.newPage();track(two);await two.goto(`${base}/`,{waitUntil:'networkidle'});
 const before=await two.evaluate(()=>window.nekopolisAudioDebug?.());
 if(before?.contextState!=='uninitialized')throw new Error(`2.5D autoplay guard failed: ${JSON.stringify(before)}`);
 await two.locator('.sim-controls button').filter({hasText:/Ⅱ|▶/}).click();
 const twoStarted=await waitForAudio(two);
 if((twoStarted?.sfxPlayed||0)<1||twoStarted?.lastCue!=='toggle')throw new Error(`2.5D toggle cue missing: ${JSON.stringify(twoStarted)}`);
 await two.locator('.audio-control').click();
 if((await two.evaluate(()=>window.nekopolisAudioDebug?.().mode))!=='sfx')throw new Error('2.5D all→sfx cycle failed');
 await two.locator('.audio-control').click();
 if((await two.evaluate(()=>window.nekopolisAudioDebug?.().mode))!=='muted')throw new Error('2.5D sfx→muted cycle failed');
 const mutedCount=await two.evaluate(()=>window.nekopolisAudioDebug?.().sfxPlayed||0);
 await two.locator('.sim-controls button').filter({hasText:/Ⅱ|▶/}).click();
 await two.waitForTimeout(150);
 if((await two.evaluate(()=>window.nekopolisAudioDebug?.().sfxPlayed||0))!==mutedCount)throw new Error('2.5D muted mode emitted SFX');
 await two.locator('.audio-control').click();
 const twoPoint=async(x,y)=>two.evaluate(({x,y})=>{const rect=document.querySelector('.dynamic-layer').getBoundingClientRect(),base=Math.min(rect.width/34,rect.height/(24*.72)),tw=base*1.2,th=base*.4*1.2;return{x:rect.left+rect.width/2+(x-y)*tw*.52,y:rect.top+rect.height*.09+(x+y)*th*.9}},{x,y});
 const roadPoint=await twoPoint(12,8);await two.mouse.click(roadPoint.x,roadPoint.y);await two.waitForTimeout(100);
 const invalidRoadPoint=await twoPoint(12,12);await two.mouse.click(invalidRoadPoint.x,invalidRoadPoint.y);await two.waitForTimeout(100);
 await two.locator('button.tool').filter({hasText:'전선'}).click();const wireA=await twoPoint(7,5),wireB=await twoPoint(10,5);await two.mouse.move(wireA.x,wireA.y);await two.mouse.down();await two.mouse.move(wireB.x,wireB.y,{steps:8});await two.mouse.up();await two.waitForTimeout(100);
 await two.mouse.move(wireA.x,wireA.y);await two.mouse.down();await two.mouse.move(wireB.x,wireB.y,{steps:8});await two.mouse.up();await two.waitForTimeout(100);
 const tutorialModal=two.getByRole('dialog',{name:'튜토리얼 완료'});if(await tutorialModal.isVisible())await tutorialModal.getByRole('button',{name:'다음 목표 보기'}).click();
 const cut=two.locator('.utility-cut');
 const probeSegment=await two.evaluate(()=>JSON.parse(localStorage.getItem('nekopolis-shared-save')).utilities.wire[0]);
 if(!probeSegment)throw new Error('2.5D audio QA did not create a utility segment');
 const ax=probeSegment.a%32,ay=Math.floor(probeSegment.a/32),bx=probeSegment.b%32,by=Math.floor(probeSegment.b/32),steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
 let selected=false;
 for(let step=0;step<=steps;step++){
  const x=Math.round(ax+(bx-ax)*step/Math.max(1,steps)),y=Math.round(ay+(by-ay)*step/Math.max(1,steps));
  const point=await twoPoint(x,y);await two.mouse.click(point.x,point.y);await two.waitForTimeout(40);
  if(!(await cut.isDisabled())){selected=true;break}
 }
 if(!selected)throw new Error('2.5D audio QA could not select utility for removal');
 await cut.click();await two.waitForTimeout(150);
 const twoFinal=await two.evaluate(()=>window.nekopolisAudioDebug?.());
 for(const cue of['select','build','utility','error','demolish','toggle'])if(!(twoFinal?.cueCounts?.[cue]>0))throw new Error(`2.5D ${cue} cue missing: ${JSON.stringify(twoFinal)}`);
 if(twoFinal?.mode!=='all'||twoFinal?.buffers!==8||!twoFinal?.musicStarted)throw new Error(`2.5D audio state failed: ${JSON.stringify(twoFinal)}`);

 const three=await context.newPage();track(three);await three.goto(`${base}/v2.html`,{waitUntil:'networkidle'});
 const sharedMode=await three.evaluate(()=>window.nekopolisAudioDebug?.().mode);
 if(sharedMode!=='all')throw new Error(`shared setting missing: ${sharedMode}`);
 const threeBefore=await three.evaluate(()=>window.nekopolisAudioDebug?.());
 if(threeBefore?.contextState!=='uninitialized')throw new Error(`3D autoplay guard failed: ${JSON.stringify(threeBefore)}`);
 await three.locator('[data-action=pause]').click();
 const threeStarted=await waitForAudio(three);
 await three.locator('[data-tool]').first().click();await three.waitForTimeout(150);
 const threeFinal=await three.evaluate(()=>window.nekopolisAudioDebug?.());
 if((threeFinal?.sfxPlayed||0)<2||threeFinal?.lastCue!=='select')throw new Error(`3D cues missing: ${JSON.stringify(threeFinal)}`);

  const degraded=await context.newPage();
  degraded.on('pageerror',e=>consoleErrors.push(`degraded page: ${e.message}`));
  degraded.on('console',m=>{if(m.type()==='error')consoleErrors.push(`degraded console: ${m.text()}`)});
  degraded.on('requestfailed',r=>{if(!r.url().endsWith('/audio/bgm-happy-town.mp3'))failures.push(`degraded request: ${r.url()} ${r.failure()?.errorText}`)});
  await degraded.route('**/audio/bgm-happy-town.mp3',route=>route.fulfill({status:200,contentType:'audio/mpeg',body:'not-valid-audio'}));
  await degraded.goto(`${base}/`,{waitUntil:'networkidle'});await degraded.locator('.sim-controls button').filter({hasText:/Ⅱ|▶/}).click();
  await degraded.waitForFunction(()=>{const d=window.nekopolisAudioDebug?.();return d?.buffers===7&&d?.sfxPlayed>=1});
  await degraded.locator('button.tool').first().click();await degraded.waitForTimeout(100);
  const degradedAudio=await degraded.evaluate(()=>window.nekopolisAudioDebug?.());
  if(degradedAudio?.failed||!degradedAudio?.musicFailed||degradedAudio?.musicStarted||degradedAudio?.buffers!==7||degradedAudio?.sfxPlayed<2||!degradedAudio?.assetFailures.includes('music'))throw new Error(`BGM failure disabled or corrupted SFX: ${JSON.stringify(degradedAudio)}`);
  await degraded.close();

 const mobile=[];
 for(const [name,url,width,height]of[['2.5D',`${base}/`,390,844],['3D',`${base}/v2.html`,390,844]]){
  const page=await context.newPage();track(page);await page.setViewportSize({width,height});await page.goto(url,{waitUntil:'networkidle'});
  const result=await page.evaluate(()=>{const button=document.querySelector('.audio-control'),header=document.querySelector('.command-bar'),b=button?.getBoundingClientRect(),h=header?.getBoundingClientRect();return{docW:document.documentElement.scrollWidth,viewW:innerWidth,button:button?.textContent?.trim(),buttonVisible:Boolean(b&&b.width>0&&b.left>=0&&b.right<=innerWidth&&b.top>=0),headerFits:Boolean(h&&h.left>=0&&h.right<=innerWidth)}});
  if(result.docW>result.viewW||!result.headerFits)throw new Error(`${name} mobile audio layout failed: ${JSON.stringify(result)}`);
  mobile.push({name,...result});await page.close();
 }
 if(failures.length||consoleErrors.length)throw new Error(JSON.stringify({failures,consoleErrors},null,2));
 console.log(JSON.stringify({twoStarted,twoFinal,threeStarted,threeFinal,degradedAudio,mobile,failures,consoleErrors},null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
