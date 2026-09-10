import {describe,expect,it} from "vitest";
import {defaultImage} from "@/lib/editor/defaults";
import {fxOptions,type ParticleEffect} from "@/lib/editor/visualFx";
import {createFXScene,displacement,particleX,particleY} from "@/lib/editor/visualFxParticles";

function scene(effect:ParticleEffect,seed="surface") {return createFXScene({...defaultImage("",""),burstEffect:effect,fxIntensity:100},seed)}
function overlapsBody(effect:ParticleEffect) {
  const s=scene(effect);
  return s.particles.filter(p=>p.front&&[.05,.15,.3].some(age=>age<p.life&&Math.abs(particleX(p,age))<s.width*.32&&Math.abs(particleY(p,age))<s.height*.32));
}
describe("effect-specific foreground composition",()=>{
  it.each(["fxImpact","fxSpark","fxMagic","fxIceShatter","fxConfetti","fxSmoke"] as const)("%s has foreground particles crossing the image body",effect=>{
    expect(overlapsBody(effect).length).toBeGreaterThanOrEqual(3);
  });
  it("keeps all main fire behind the image, allowing only small embers in front",()=>{
    for(const seed of ["a","b","c"]){const s=scene("fxFireBurst",seed);
      expect(s.particles.filter(p=>p.kind==="flame").length).toBeGreaterThan(15);
      expect(s.particles.filter(p=>p.kind==="flame").every(p=>!p.front)).toBe(true);
      const front=s.particles.filter(p=>p.front);
      expect(front.length).toBeGreaterThan(0);
      expect(front.every(p=>p.kind==="spark"&&p.size<2)).toBe(true);
    }
  });
  it("puts the majority of electrical trunks across the actual image interior",()=>{
    const s=scene("fxElectric"),foreground=s.arcs.filter(a=>a.front);
    expect(foreground.length/s.arcs.length).toBeGreaterThan(.75);
    for(const arc of foreground){
      expect(arc.frames.some(path=>{for(let j=0;j<path.length;j+=2)if(Math.abs(path[j])<s.width*.2&&Math.abs(path[j+1])<s.height*.2)return true;return false})).toBe(true);
      expect(arc.frames[0]).not.toEqual(arc.frames[1]);
      expect(arc.branches[0]).toHaveLength(2);
    }
  });
  it("emits independent spark sprays across the gift instead of one center or a perimeter wheel",()=>{
    const s=scene("fxSpark"),sparks=s.particles;
    expect(Math.max(...sparks.map(p=>p.x))-Math.min(...sparks.map(p=>p.x))).toBeGreaterThan(s.width*.7);
    expect(Math.max(...sparks.map(p=>p.y))-Math.min(...sparks.map(p=>p.y))).toBeGreaterThan(s.height*.7);
    expect(new Set(sparks.map(p=>p.originIndex)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(sparks.map(p=>`${Math.sign(p.vx)}:${Math.sign(p.vy)}`)).size).toBe(4);
    expect(overlapsBody("fxSpark").length).toBeGreaterThanOrEqual(3);
    expect(new Set(sparks.map(p=>p.trail.toFixed(3))).size).toBeGreaterThan(12);
    expect(new Set(sparks.map(p=>p.life.toFixed(3))).size).toBeGreaterThan(12);
  });
  it("stages impact pressure, foreground ejecta, and delayed residual sparks",()=>{
    const s=scene("fxImpact"),clouds=s.particles.filter(p=>p.kind==="blast"),debris=s.particles.filter(p=>p.kind==="debris");
    expect(clouds.length).toBeGreaterThan(5);expect(clouds.every(p=>!p.front&&p.delay<.07)).toBe(true);
    expect(debris.length).toBeGreaterThan(0);expect(debris.every(p=>p.front&&p.delay>=.08)).toBe(true);
    expect(s.particles.some(p=>p.kind==="spark"&&p.delay>=.2)).toBe(true);
    expect(s.particles.every(p=>p.delay+p.life<=1.000001)).toBe(true);
  });
  it.each(fxOptions)("%s stays within its allocation and lifetime bounds",effect=>{
    const s=scene(effect);
    expect(s.particles.length).toBeLessThanOrEqual(60);
    for(const p of s.particles)for(const age of [0,p.life/2,p.life]){
      expect(Math.abs(particleX(p,age))+p.size).toBeLessThan(s.width/2+s.padding);
      expect(Math.abs(particleY(p,age))+p.size).toBeLessThan(s.height/2+s.padding);
    }
  });
});
it("uses drag and gravity with elapsed time rather than lifetime-normalized motion",()=>{
  const early=displacement(600,0,3,.1),later=displacement(600,0,3,.5)-displacement(600,0,3,.4);
  expect(early).toBeGreaterThan(later*2);
  expect(displacement(0,200,1,.6)).toBeGreaterThan(displacement(0,200,1,.3)*2);
});

it("includes every electrical branch and glow in bounds for large imported images",()=>{
  const s=createFXScene({...defaultImage("",""),w:160,h:160,burstEffect:"fxElectric"},"large");
  for(const arc of s.arcs)for(let f=0;f<arc.frames.length;f++)for(const path of [arc.frames[f],...arc.branches[f]])for(let j=0;j<path.length;j+=2){
    expect(Math.abs(path[j])+arc.thickness*8).toBeLessThan(s.width/2+s.padding);
    expect(Math.abs(path[j+1])+arc.thickness*8).toBeLessThan(s.height/2+s.padding);
  }
});
