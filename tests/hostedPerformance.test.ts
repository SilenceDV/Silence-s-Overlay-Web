import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {HostedPerformance,QualityPolicy} from "@/lib/overlays/performance";
import {reconcileProject} from "@/lib/overlays/reconcileProject";
import {defaultProject} from "@/lib/editor/defaults";

let frames:Map<number,FrameRequestCallback>,id:number;
beforeEach(()=>{
  frames=new Map();id=0;
  vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});
  vi.stubGlobal("cancelAnimationFrame",(id:number)=>frames.delete(id));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function tick(time:number){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}

it("coalesces multiple effects into one RAF and stops after the last completed effect",()=>{
  const runtime=new HostedPerformance();
  runtime.add(now=>now<100,20,2);runtime.add(now=>now<200,30,2);
  expect(frames.size).toBe(1);expect(runtime.snapshot()).toMatchObject({activeParticles:50,activeCanvases:4,quality:"high"});
  tick(100);expect(frames.size).toBe(1);expect(runtime.snapshot().activeCanvases).toBe(2);
  tick(200);expect(frames.size).toBe(0);expect(runtime.snapshot().activeParticles).toBe(0);
});
it("cancels removals and releases diagnostics on disposal",()=>{
  const runtime=new HostedPerformance(),remove=runtime.add(()=>true,10,2);
  remove();expect(frames.size).toBe(0);
  runtime.setDiagnostics(true);expect(frames.size).toBe(1);runtime.dispose();expect(frames.size).toBe(0);
});
it("does not accumulate callbacks or scene accounting across repeated bursts",()=>{
  const runtime=new HostedPerformance();
  for(let i=0;i<1000;i++){runtime.add(()=>false,20,2);tick(i*1000);expect(frames.size).toBe(0);}
  expect(runtime.snapshot()).toMatchObject({activeParticles:0,activeCanvases:0});runtime.dispose();
});
it("reports diagnostic content and frame statistics without React updates",()=>{
  const info=vi.spyOn(console,"info").mockImplementation(()=>{}),runtime=new HostedPerformance();
  runtime.setContent(3,7);runtime.setDiagnostics(true);tick(5000);tick(5016);tick(10000);
  expect(info).toHaveBeenLastCalledWith("[overlay perf]",expect.objectContaining({averageFrameMs:16,fps:62.5,slideCount:3,activeLayers:7,quality:"high"}));
  runtime.dispose();
});
it("uses sustained pressure, bounded tiers and slower recovery without changing frame cadence",()=>{
  const policy=new QualityPolicy();policy.sample(90,40);expect(policy.tier).toBe(0);
  for(let i=0;i<50;i++)policy.sample(33,15);expect(policy.tier).toBe(1);
  for(let i=0;i<150;i++)policy.sample(33,15);expect(policy.tier).toBe(2);
  for(let i=0;i<100;i++)policy.sample(16,1);expect(policy.tier).toBe(2);
  for(let i=0;i<1000;i++)policy.sample(16,1);expect(policy.tier).toBe(0);
  for(let i=0;i<100;i++)policy.sample(500,200);expect(policy.tier).toBe(0);
});
it("retains unchanged JSON layer identities including nested animation settings",()=>{
  const previous=defaultProject(),next=structuredClone(previous);
  expect(reconcileProject(previous,next)).toBe(previous);
  next.slides[0].layers.push({...next.slides[0].layers[0],id:"second"});
  const result=reconcileProject(previous,next);
  expect(result.slides[0].layers[0]).toBe(previous.slides[0].layers[0]);
  expect(result.slides[0].layers).toHaveLength(2);
});
