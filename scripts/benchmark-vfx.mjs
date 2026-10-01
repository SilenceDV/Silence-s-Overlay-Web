import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.cwd().replaceAll('\\','/');
const ts=(await import(pathToFileURL(root+'/node_modules/typescript/lib/typescript.js').href)).default;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE,'index.mjs')).href:'playwright');
const files=['defaults','visualFx','visualFxParticles','visualFxEmitters','visualFxMaterial','visualFxTextures','visualFxCanvas','imageShape'].map(x=>'lib/editor/'+x+'.ts');
function bundle(baseline){
 const modules=files.map(file=>{
  const source=baseline?cp.execFileSync('git',['-c','safe.directory='+root,'show',(process.env.PERF_BASE || '5ee0e7f792fbc1261b10c16b06bfb1ad6f621de5')+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(root+'/'+file,'utf8');
  return JSON.stringify(file.slice(0,-3))+':function(require,module,exports){'+ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText+'}';
 });
 return '(function(){const modules={'+modules.join(',')+'},cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};modules[id](name=>{const target=name.startsWith("@/")?name.slice(2):id.slice(0,id.lastIndexOf("/")+1)+name.slice(2);return load(target)},module,module.exports);return module.exports;}return {renderer:load("lib/editor/visualFxCanvas"),defaults:load("lib/editor/defaults")};})()';
}
(async()=>{
 const browser=await chromium.launch({channel:process.env.PERF_BROWSER || 'chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
 page.on('pageerror',error=>console.error('BROWSER',error));
 await page.setContent('<html><body style="margin:0;background:#18202b;color:white;font:14px sans-serif"><div id="results"></div></body></html>');
 await page.addScriptTag({content:'window.before='+bundle(true)+';window.after='+bundle(false)+';'});
 const results=await page.evaluate(()=>{
   crypto.randomUUID=()=>"benchmark-fixture";
   const effects=['fxImpact','fxSpark','fxMagic','fxConfetti','fxElectric','fxSmoke','fxFireBurst','fxIceShatter','fxShockwave'];
   const output=[];
   for(const effect of effects){
     const variants=[];
     for(const [name,api] of [['before',window.before],['after',window.after]]){
       const layer={...api.defaults.defaultImage('',''),id:'benchmark',burstEffect:effect,fxIntensity:100};
       const scene=api.renderer.createFXScene(layer,'benchmark');scene.hosted=name==='after';
       const setup=performance.now();api.renderer.prepareFX(scene);const setupMs=performance.now()-setup;
       const resolution=api.renderer.canvasResolution(scene.width+scene.padding*2,scene.height+scene.padding*2,1);
       const canvases=[document.createElement('canvas'),document.createElement('canvas')];
       const contexts=canvases.map(c=>{c.width=resolution.width;c.height=resolution.height;return c.getContext('2d',{willReadFrequently:true});});
       const counts={gradients:0,pathCommands:0,drawImages:0};
       for(const ctx of contexts)for(const [method,key] of [['createLinearGradient','gradients'],['moveTo','pathCommands'],['lineTo','pathCommands'],['bezierCurveTo','pathCommands'],['drawImage','drawImages']]){
         const fn=ctx[method].bind(ctx);ctx[method]=(...args)=>{counts[key]++;return fn(...args);};
       }
       // Warm the renderer and textures, then time 60 frames including raster completion.
       for(let i=0;i<10;i++)contexts.forEach((ctx,plane)=>api.renderer.drawFX(ctx,scene,.2,!!plane));
       counts.gradients=counts.pathCommands=counts.drawImages=0;
       const samples=[];
       for(let run=0;run<5;run++){
         counts.gradients=counts.pathCommands=counts.drawImages=0;
         const begin=performance.now();
         for(let i=0;i<60;i++){
           contexts.forEach((ctx,plane)=>api.renderer.drawFX(ctx,scene,i/60,!!plane));
           contexts.forEach(ctx=>ctx.getImageData(0,0,1,1));
         }
         samples.push((performance.now()-begin)/60);
       }
       const rasterMs=[...samples].sort((a,b)=>a-b)[2],frameCounts={...counts};
       const snapshots=[];
       for(const time of [.1,.3,.6]){
         contexts.forEach((ctx,plane)=>api.renderer.drawFX(ctx,scene,time,!!plane));
         const merged=document.createElement('canvas');merged.width=resolution.width;merged.height=resolution.height;
         const ctx=merged.getContext('2d');canvases.forEach(c=>ctx.drawImage(c,0,0));
         snapshots.push(ctx.getImageData(0,0,merged.width,merged.height).data);
         if(time===.3){merged.style.width='270px';merged.style.height='180px';merged.style.objectFit='contain';const item=document.createElement('div');item.style.cssText='display:inline-block;width:290px';item.append(effect+' '+name,merged);document.querySelector('#results').append(item);}
       }
       variants.push({name,setupMs,rasterMs,samples,counts:frameCounts,snapshots});
     }
     let sum=0,channels=0,max=0;
     for(let i=0;i<3;i++)for(let j=0;j<variants[0].snapshots[i].length;j++){
       const delta=Math.abs(variants[0].snapshots[i][j]-variants[1].snapshots[i][j]);sum+=delta;max=Math.max(max,delta);channels++;
     }
     output.push({effect,before:{...variants[0],snapshots:undefined},after:{...variants[1],snapshots:undefined},meanAbsoluteChannelDifference:sum/channels,maxChannelDifference:max});
   }
   return {userAgent:navigator.userAgent,devicePixelRatio,results:output};
 });
 const out=process.env.PERF_OUTPUT || path.join(root,'work','performance');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/performance-benchmark.json',JSON.stringify(results,null,2));
 await page.screenshot({path:out+'/vfx-before-after.png',fullPage:true});
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(err=>{console.error(err);process.exit(1);});
