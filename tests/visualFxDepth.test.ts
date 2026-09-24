import {expect,it} from "vitest";
import {defaultImage} from "@/lib/editor/defaults";
import {fxOptions} from "@/lib/editor/visualFx";
import {createFXScene,particleScale,particleX,particleY} from "@/lib/editor/visualFxParticles";
import {canvasResolution,MAX_FX_PIXELS} from "@/lib/editor/visualFxCanvas";

it("approaching objects grow and gain travel while distant particles recede",()=>{
  const s=createFXScene({...defaultImage("",""),burstEffect:"fxIceShatter",fxIntensity:100},"depth");
  const near=s.particles.filter(p=>p.front&&p.vz>.8),far=s.particles.filter(p=>!p.front);
  expect(near.length).toBeGreaterThan(3);expect(far.length).toBeGreaterThan(0);
  for(const p of near){
    expect(particleScale(p,.5)).toBeGreaterThan(particleScale(p,0)*1.5);
    const flat={...p,z:0,vz:0},age=.4;
    expect(Math.hypot(particleX(p,age)-p.x,particleY(p,age)-p.y)).toBeGreaterThan(Math.hypot(particleX(flat,age)-p.x,particleY(flat,age)-p.y));
    expect(particleX(p,0)).toBe(p.x);expect(particleY(p,0)).toBe(p.y);
  }
  for(const p of far)expect(particleScale(p,.5)).toBeLessThan(particleScale(p,0));
});
it.each(fxOptions)("%s contains projected travel and glow at extreme size/spread without increasing canvas limits",burstEffect=>{
  for(const [w,h] of [[12,35],[80,18],[160,160]]){
    const s=createFXScene({...defaultImage("",""),burstEffect,w,h,fxSize:200,fxSpread:200,fxIntensity:150},"perspective-bounds");
    for(const p of s.particles)for(let sample=0;sample<=20;sample++){
      const age=p.life*sample/20,scale=particleScale(p,age);
      const radius=p.size*scale*(p.kind==="blast"||p.kind==="smoke"?2.6:p.kind==="flame"?3.4:p.kind==="spark"?8:5);
      expect(scale).toBeLessThanOrEqual(1/.52);
      expect(Math.abs(particleX(p,age))+radius).toBeLessThan(s.width/2+s.padding);
      expect(Math.abs(particleY(p,age))+radius).toBeLessThan(s.height/2+s.padding);
    }
    const resolution=canvasResolution(s.width+s.padding*2,s.height+s.padding*2,3);
    expect(resolution.width*resolution.height).toBeLessThanOrEqual(MAX_FX_PIXELS);
    expect(Math.max(resolution.width,resolution.height)).toBeLessThanOrEqual(1536);
  }
});
