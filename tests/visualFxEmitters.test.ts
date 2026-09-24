import {expect,it} from "vitest";
import {createEmitters,type EmitterStrategy} from "@/lib/editor/visualFxEmitters";
import {createFXScene,seededRandom} from "@/lib/editor/visualFxParticles";
import {defaultImage} from "@/lib/editor/defaults";
it.each(["center","perimeter","surface","fullArea","bottomEdge","multiPoint"] as EmitterStrategy[])("%s produces deterministic independent origins",strategy=>{
  const a=createEmitters(500,300,seededRandom("emitter")),b=createEmitters(500,300,seededRandom("emitter"));
  const samples=Array.from({length:24},(_,i)=>a.sample(strategy,i));
  expect(samples).toEqual(Array.from({length:24},(_,i)=>b.sample(strategy,i)));
  expect(new Set(samples.map(p=>`${p.x}:${p.y}`)).size).toBe(24);
  expect(samples.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
});
it("distributes perimeter emitters over all four edges without fixing points on a circle",()=>{
  const e=createEmitters(500,300,seededRandom("edges")),points=Array.from({length:24},(_,i)=>e.sample("perimeter",i));
  for(const side of [points.filter(p=>p.x< -200),points.filter(p=>p.x>200),points.filter(p=>p.y< -120),points.filter(p=>p.y>120)])expect(side.length).toBeGreaterThanOrEqual(6);
});
it.each(["fxImpact","fxSpark","fxIceShatter"] as const)("%s emits its main action in the core with varied trajectories",burstEffect=>{
  const s=createFXScene({...defaultImage("",""),burstEffect,fxIntensity:100},"whole-gift");
  expect(s.origins).toHaveLength(6);
  expect(new Set(s.particles.map(p=>p.originIndex)).size).toBeGreaterThanOrEqual(6);
  const main=s.particles.filter(p=>p.delay<.13);
  expect(main.length).toBeGreaterThan(6);
  expect(main.every(p=>Math.abs(p.x)<=s.width*.1&&Math.abs(p.y)<=s.height*.1)).toBe(true);
});
it("legacy shockwave is a rear effect, not an impact spray over the image",()=>{
  const s=createFXScene({...defaultImage("",""),burstEffect:"fxShockwave"});
  expect(s.shockwaveOnly).toBe(true);expect(s.particles.every(p=>!p.front)).toBe(true);
  expect(s.particles.some(p=>p.kind==="blast"||p.kind==="spark")).toBe(false);
});

it("foreground smoke uses every surface region instead of repeating three origins",()=>{
 for(const seed of ["a","b","c"]){const s=createFXScene({...defaultImage("",""),burstEffect:"fxSmoke",fxIntensity:100},seed);
 expect(new Set(s.particles.filter(p=>p.front).map(p=>p.originIndex)).size).toBe(6)}
});
it("restrains electric to three foreground trunks and one short branch at a time",()=>{
 const s=createFXScene({...defaultImage("",""),burstEffect:"fxElectric",fxIntensity:150},"all-sides");
 for(let t=.04;t<.78;t+=.02){const active=s.arcs.filter(a=>t>=a.delay&&t<a.delay+a.life);
 expect(active.length).toBeLessThanOrEqual(3);expect(active.every(a=>a.front)).toBe(true);
 expect(active.reduce((n,a)=>n+a.branches[0].length,0)).toBeLessThanOrEqual(1);}
});
