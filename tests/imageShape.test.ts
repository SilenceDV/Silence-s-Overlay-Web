import {afterEach,expect,it,vi} from "vitest";
import {analyzeAlpha,projectImageShape,loadImageShape} from "@/lib/editor/imageShape";
import {defaultImage} from "@/lib/editor/defaults";
import {createFXScene,particleX,particleY} from "@/lib/editor/visualFxParticles";
import {fxOptions} from "@/lib/editor/visualFx";
const make=(inside:(x:number,y:number)=>boolean)=>{const data=new Uint8ClampedArray(96*96*4);for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(inside(x,y))data[(y*96+x)*4+3]=255;return analyzeAlpha(data,96,96)};
const fixtures={round:make((x,y)=>{const r=Math.hypot(x-48,y-48);return r<25&&r>9}),tall:make((x,y)=>x>40&&x<55&&y>10&&y<85),wide:make((x,y)=>x>10&&x<85&&y>40&&y<55),irregular:make((x,y)=>x>20&&x<70&&y>20&&y<75&&(x<35||y>57))};
const layer={...defaultImage("",""),w:25,h:480/10.8,imageWidth:25,imageHeight:480/10.8,fxIntensity:100};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()});
it.each(Object.entries(fixtures))("%s uses visible bounds, alpha material, and bounded electric paths",(_,source)=>{
 const shape=projectImageShape(source,layer)!;
 expect(shape.width).toBeLessThan(480);expect(shape.height).toBeLessThan(480);expect(shape.edges.length).toBeGreaterThan(0);
 for(const [burstEffect] of fxOptions){const s=createFXScene({...layer,burstEffect},"shape",shape);
 expect(s.width).toBe(shape.width);expect(s.height).toBe(shape.height);expect(s.originX).toBe(shape.x);expect(s.originY).toBe(shape.y);
 const material=new Set(shape.points.map(p=>`${p.x}:${p.y}`));
 for(const p of s.particles)if(burstEffect!=="fxElectric")expect(material.has(`${p.x}:${p.y}`)).toBe(true);
 for(const arc of s.arcs)for(const path of arc.frames)for(let i=0;i<path.length;i+=2)expect(shape.points.some(p=>Math.hypot(p.x-path[i],p.y-path[i+1])<.001)).toBe(true);
 if(["fxImpact","fxSpark","fxIceShatter","fxConfetti"].includes(burstEffect)){
 const front=s.particles.filter(p=>p.front&&p.delay<.13);
 expect(front.length).toBeGreaterThan(5);
 expect(front.filter(p=>Math.abs(particleX(p,.06))<shape.width*.5&&Math.abs(particleY(p,.06))<shape.height*.5).length/front.length).toBeGreaterThan(.5);
 }
 }
});
it("weights centroid by alpha instead of the transparent rectangle",()=>{
 const data=new Uint8ClampedArray(4*4);data[3]=255;data[15]=85;
 const shape=projectImageShape(analyzeAlpha(data,4,1),{...layer,imageHeight:120/10.8,h:120/10.8})!;
 expect(shape.x).toBeCloseTo(-90);expect(shape.y).toBe(0);
});
it("matches image contain, zoom, translation and clipping without mutating project data",()=>{
 const original=JSON.stringify(layer),shape=projectImageShape(fixtures.round,layer)!;
 const shifted=projectImageShape(fixtures.round,{...layer,cropX:25,cropY:-17})!;
 expect(shifted.x-shape.x).toBeCloseTo(25);expect(shifted.y-shape.y).toBeCloseTo(-17);
 const zoom=projectImageShape(fixtures.round,{...layer,cropZoom:120})!;expect(zoom.width/shape.width).toBeCloseTo(1.2);
 expect(projectImageShape(fixtures.round,{...layer,cropX:900})).toBeNull();expect(JSON.stringify(layer)).toBe(original);
 expect(projectImageShape(make(()=>false),layer)).toBeNull();
});
it("spread changes travel without moving any emission point",()=>{
 const shape=projectImageShape(fixtures.round,layer)!;
 for(const [burstEffect] of fxOptions){const a=createFXScene({...layer,burstEffect,fxSpread:25},"spread",shape),b=createFXScene({...layer,burstEffect,fxSpread:200},"spread",shape);
 expect(a.particles.map(p=>[p.x,p.y,p.kind])).toEqual(b.particles.map(p=>[p.x,p.y,p.kind]));}
});
it("deduplicates in-flight source reads and scans alpha only once across replays",async()=>{
 const holder={} as {image:{onload:()=>void;naturalWidth:number;naturalHeight:number}};
 class FixtureImage {naturalWidth=96;naturalHeight=96;onload=()=>{};onerror=()=>{};constructor(){Object.assign(holder,{image:this})}}
 vi.stubGlobal("Image",FixtureImage);
 const scan=vi.fn(()=>({data:new Uint8ClampedArray(96*96*4)}));
 vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue({drawImage:vi.fn(),getImageData:scan} as unknown as CanvasRenderingContext2D);
 const a=loadImageShape("cache-fixture"),b=loadImageShape("cache-fixture");expect(a).toBe(b);holder.image.onload();await a;
 expect(await loadImageShape("cache-fixture")).toBe(await a);expect(scan).toHaveBeenCalledTimes(1);
});
it("handles CORS-tainted alpha reads without rejecting or altering the DOM image",async()=>{
 const holder={} as {image:{onload:()=>void}};class FixtureImage {naturalWidth=96;naturalHeight=96;onload=()=>{};onerror=()=>{};constructor(){Object.assign(holder,{image:this})}}
 vi.stubGlobal("Image",FixtureImage);vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue({drawImage:vi.fn(),getImageData:()=>{throw new Error("tainted")}} as unknown as CanvasRenderingContext2D);
 const result=loadImageShape("cors-fixture");holder.image.onload();expect(await result).toBeNull();
});


it.each(Object.entries(fixtures))("%s confetti fans immediately from its cropped lower silhouette",(_,source)=>{
 const shape=projectImageShape(source,{...layer,cropX:23,cropY:-19})!;
 const s=createFXScene({...layer,burstEffect:"fxConfetti"},"bottom",shape);
 const left=Math.min(...shape.points.map(p=>p.x));
 const bin=(x:number)=>Math.min(15,Math.floor((x-left)/shape.width*16));
 for(const p of s.particles){
  const bottom=Math.max(...shape.points.filter(q=>bin(q.x)===bin(p.x)).map(q=>q.y));
  expect(p.y).toBeCloseTo(bottom);
  expect(p.delay).toBeLessThan(.03);
  expect(particleY(p,.06)).toBeLessThan(p.y);
 }
 const span=(xs:number[])=>Math.max(...xs)-Math.min(...xs);
 expect(span(s.particles.map(p=>p.x))).toBeGreaterThan(shape.width*.8);
 expect(span(s.particles.map(p=>particleX(p,.06)))).toBeGreaterThan(shape.width*.8);
 expect(s.particles.filter(p=>p.front).length/s.particles.length).toBeGreaterThan(.6);
 const broad=createFXScene({...layer,burstEffect:"fxConfetti",fxSpread:200},"bottom",shape);
 expect(span(broad.particles.map(p=>particleX(p,.06)))).toBeGreaterThan(span(s.particles.map(p=>particleX(p,.06))));
});
it.each(Object.entries(fixtures))("%s electricity uses material contacts and brief restrained restrikes",(_,source)=>{
 const shape=projectImageShape(source,layer)!;
 for(const intensity of [50,100,150]){
  const s=createFXScene({...layer,burstEffect:"fxElectric",fxIntensity:intensity},"contacts",shape);
  const spread=createFXScene({...layer,burstEffect:"fxElectric",fxIntensity:intensity,fxSpread:200},"contacts",shape);
  expect(s.arcs).toEqual(spread.arcs);
  for(let t=0;t<1;t+=.005){
   const active=s.arcs.filter(a=>t>=a.delay&&t<a.delay+a.life);
   expect(active.length).toBeLessThanOrEqual(intensity>100?3:2);
   expect(active.reduce((n,a)=>n+a.branches[0].length,0)).toBeLessThanOrEqual(1);
  }
  for(const arc of s.arcs){
   expect(arc.front).toBe(true);expect(arc.life).toBeLessThan(.25);
   expect(arc.delay+arc.life).toBeLessThan(1);
   for(const frame of arc.frames){
    for(const j of [0,frame.length-2])expect(shape.points.some(p=>Math.hypot(p.x-frame[j],p.y-frame[j+1])<.001)).toBe(true);
   }
  }
 }
});
it.each(Object.entries(fixtures))("%s bolt segments do not bridge transparent holes or concave gaps",(_,source)=>{
 const shape=projectImageShape(source,layer)!;
 const s=createFXScene({...layer,burstEffect:"fxElectric",fxIntensity:150},"silhouette-routing",shape);
 // Each source sample covers 5px in this 480px fixture; allow its half diagonal.
 for(const arc of s.arcs)for(let f=0;f<arc.frames.length;f++)for(const path of [arc.frames[f],...arc.branches[f]]){
  for(let j=2;j<path.length;j+=2)for(let t=0;t<=1;t+=.2){
   const x=path[j-2]+(path[j]-path[j-2])*t,y=path[j-1]+(path[j+1]-path[j-1])*t;
   expect(shape.points.some(p=>Math.hypot(p.x-x,p.y-y)<3.6)).toBe(true);
  }
 }
});
