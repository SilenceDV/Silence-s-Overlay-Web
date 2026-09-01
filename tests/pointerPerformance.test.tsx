import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CanvasStage } from "@/components/editor/CanvasStage";
import { defaultProject } from "@/lib/editor/defaults";
import type { EditorApi } from "@/hooks/useEditorState";

it("keeps a 60-second-equivalent pointer stream local and commits once",()=>{
  const project=defaultProject(),updateLayer=vi.fn(),updateLayerLive=vi.fn(),checkpoint=vi.fn(),interaction=vi.fn();
  const api=new Proxy({updateLayer,updateLayerLive,checkpoint,selectLayer:vi.fn()} as unknown as EditorApi,{get:(target,key)=>Reflect.get(target,key)??vi.fn()});
  Object.defineProperty(HTMLElement.prototype,"setPointerCapture",{configurable:true,value:vi.fn()});
  Object.defineProperty(HTMLElement.prototype,"hasPointerCapture",{configurable:true,value:()=>true});
  vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{callback(performance.now());return 1});
  vi.stubGlobal("cancelAnimationFrame",vi.fn());
  vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});
  const view=render(<CanvasStage slide={project.slides[0]} settings={project.settings} selected={project.slides[0].layers[0].id} api={api} onInteractionChange={interaction}/>);
  const layer=view.container.querySelector(".layerBox")!;
  vi.spyOn(layer,"getBoundingClientRect").mockReturnValue({left:0,top:0,width:1920,height:1080,right:1920,bottom:1080,x:0,y:0,toJSON:()=>({})});
  act(()=>{fireEvent.pointerDown(layer,{pointerId:1,clientX:960,clientY:540});for(let frame=0;frame<3600;frame+=1)fireEvent.pointerMove(layer,{pointerId:1,clientX:960+(frame%100),clientY:540+(frame%50)});fireEvent.pointerUp(layer,{pointerId:1,clientX:1000,clientY:560})});
  expect(updateLayer).toHaveBeenCalledOnce();
  expect(updateLayerLive).not.toHaveBeenCalled();
  expect(checkpoint).not.toHaveBeenCalled();
  expect(interaction).toHaveBeenNthCalledWith(1,true);
  expect(interaction).toHaveBeenLastCalledWith(false);
});

it.runIf(process.env.RUN_LONG_PERF==="1")("sustains real-time pointer updates for at least 60 seconds",async()=>{
  const project=defaultProject(),updateLayer=vi.fn(),updateLayerLive=vi.fn(),checkpoint=vi.fn();
  const api=new Proxy({updateLayer,updateLayerLive,checkpoint,selectLayer:vi.fn()} as unknown as EditorApi,{get:(target,key)=>Reflect.get(target,key)??vi.fn()});
  Object.defineProperty(HTMLElement.prototype,"setPointerCapture",{configurable:true,value:vi.fn()});
  Object.defineProperty(HTMLElement.prototype,"hasPointerCapture",{configurable:true,value:()=>true});
  vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{callback(performance.now());return 1});
  vi.stubGlobal("cancelAnimationFrame",vi.fn());
  vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});
  const view=render(<CanvasStage slide={project.slides[0]} settings={project.settings} selected={project.slides[0].layers[0].id} api={api}/>),layer=view.container.querySelector(".layerBox")!;
  vi.spyOn(layer,"getBoundingClientRect").mockReturnValue({left:0,top:0,width:1920,height:1080,right:1920,bottom:1080,x:0,y:0,toJSON:()=>({})});
  fireEvent.pointerDown(layer,{pointerId:1,clientX:960,clientY:540});
  const started=performance.now();let events=0;
  while(performance.now()-started<60_000){fireEvent.pointerMove(layer,{pointerId:1,clientX:960+(events%100),clientY:540+(events%50)});events+=1;await new Promise(resolve=>setTimeout(resolve,16))}
  fireEvent.pointerUp(layer,{pointerId:1,clientX:1000,clientY:560});
  expect(performance.now()-started).toBeGreaterThanOrEqual(60_000);
  expect(events).toBeGreaterThan(1800);
  expect(updateLayer).toHaveBeenCalledOnce();
  expect(updateLayerLive).not.toHaveBeenCalled();
  expect(checkpoint).not.toHaveBeenCalled();
},70_000);
