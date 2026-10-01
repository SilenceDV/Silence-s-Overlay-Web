import React from "react";
import {act,cleanup,render} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {OverlayClient} from "@/app/o/[publicId]/OverlayClient";
import {defaultImage,defaultProject} from "@/lib/editor/defaults";
import {VisualFX} from "@/components/editor/VisualFX";
const connection=vi.hoisted(()=>({refresh:undefined as undefined|(()=>void)}));
vi.mock("@/lib/supabase/client",()=>({createSupabaseBrowserClient:()=>{const channel={on:(_type:string,_filter:unknown,callback:()=>void)=>{connection.refresh=callback;return channel},subscribe:()=>channel};return {channel:()=>channel,removeChannel:vi.fn()}}}));
vi.mock("@/components/editor/StageViewport",()=>({StageViewport:({children}:{children:React.ReactNode})=>children}));
vi.mock("@/components/editor/CanvasStage",()=>({ImageContent:()=>null,TextContent:()=>null}));
vi.mock("@/components/editor/VisualFX",()=>({VisualFX:vi.fn(()=>null)}));
beforeEach(()=>{vi.stubGlobal("React",React);vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks()});
it("remounts shared FX on every hosted slide appearance and preserves it on unchanged refreshes",async()=>{
  const mounts=vi.fn();vi.mocked(VisualFX).mockImplementation(()=>{React.useEffect(()=>{mounts()},[]);return null});
  const project=defaultProject();project.settings.speed=1;
  const layer={...defaultImage("",""),burstEffect:"fxSpark" as const};
  project.slides=[{...project.slides[0],id:"first",layers:[layer]},{...project.slides[0],id:"second",layers:[{...layer}]}];
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({active:true,project:structuredClone(project)})}));vi.stubGlobal("fetch",fetcher);
  render(<OverlayClient project={project} publicId="test"/>);
  await act(async()=>{await Promise.resolve()});expect(mounts).toHaveBeenCalledTimes(1);
  await act(async()=>{connection.refresh?.();await Promise.resolve()});expect(mounts).toHaveBeenCalledTimes(1);
  await act(async()=>{vi.advanceTimersByTime(1000)});expect(mounts).toHaveBeenCalledTimes(2);
  await act(async()=>{vi.advanceTimersByTime(1000)});expect(mounts).toHaveBeenCalledTimes(3);
});

it("passes hosted performance only to visible active-slide FX and avoids unchanged renders",async()=>{
  const project=defaultProject(),layer={...defaultImage("",""),burstEffect:"fxSpark" as const};
  project.slides=[{...project.slides[0],layers:[layer,{...layer,id:"invisible",opacity:0}]},{...project.slides[0],id:"inactive",layers:[{...layer,id:"other"}]}];
  const saved=structuredClone(project);
  vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({active:true,project:structuredClone(saved)})})));
  const view=render(<OverlayClient project={project} publicId="test"/>);
  await act(async()=>{await Promise.resolve()});
  expect(VisualFX).toHaveBeenCalledTimes(1);
  expect(vi.mocked(VisualFX).mock.calls[0][0]).toMatchObject({layer,performance:expect.objectContaining({quality:expect.objectContaining({tier:0})})});
  expect((view.container.firstElementChild as HTMLElement).style.background).toBe("transparent");
  await act(async()=>{connection.refresh?.();await Promise.resolve()});expect(VisualFX).toHaveBeenCalledTimes(1);
  saved.slides[0].layers[0]={...layer,fxPrimaryColor:"#123456"};
  await act(async()=>{connection.refresh?.();await Promise.resolve()});expect(VisualFX).toHaveBeenCalledTimes(2);
});

it("queues a realtime update received during an in-flight fetch",async()=>{
  const project=defaultProject();
  let resolve!:(response:unknown)=>void;
  const fetcher=vi.fn().mockImplementationOnce(()=>new Promise(done=>{resolve=done})).mockResolvedValue({ok:true,json:async()=>({active:false})});
  vi.stubGlobal("fetch",fetcher);
  const view=render(<OverlayClient project={project} publicId="test"/>);
  await act(async()=>{connection.refresh?.();resolve({ok:true,json:async()=>({active:true,project})});});
  expect(fetcher).toHaveBeenCalledTimes(2);expect(view.container.childElementCount).toBe(0);
});

it("cleans up polling and aborts an outstanding status request on unmount",()=>{
  const fetcher=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal("fetch",fetcher);
  const view=render(<OverlayClient project={defaultProject()} publicId="test"/>);
  const signal=(fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].signal!;
  view.unmount();expect(signal.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
