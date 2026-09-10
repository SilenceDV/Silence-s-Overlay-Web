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
it.each(["fxImpact","fxSpark","fxIceShatter"] as const)("%s uses at least six origins spanning the gift",burstEffect=>{
  const s=createFXScene({...defaultImage("",""),burstEffect,fxIntensity:100},"whole-gift");
  expect(s.origins).toHaveLength(6);
  expect(new Set(s.particles.map(p=>p.originIndex)).size).toBeGreaterThanOrEqual(6);
  expect(Math.max(...s.particles.map(p=>p.x))-Math.min(...s.particles.map(p=>p.x))).toBeGreaterThan(s.width*.65);
  expect(Math.max(...s.particles.map(p=>p.y))-Math.min(...s.particles.map(p=>p.y))).toBeGreaterThan(s.height*.65);
});
it("legacy shockwave is a rear effect, not an impact spray over the image",()=>{
  const s=createFXScene({...defaultImage("",""),burstEffect:"fxShockwave"});
  expect(s.shockwaveOnly).toBe(true);expect(s.particles.every(p=>!p.front)).toBe(true);
  expect(s.particles.some(p=>p.kind==="blast"||p.kind==="spark")).toBe(false);
});
