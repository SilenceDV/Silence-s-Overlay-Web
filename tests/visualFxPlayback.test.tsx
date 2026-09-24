import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultImage } from "@/lib/editor/defaults";
import { ImageContent } from "@/components/editor/CanvasStage";
import { VisualFX } from "@/components/editor/VisualFX";
import { FXReplayProvider } from "@/components/editor/FXReplay";
import { ImageLayerControls } from "@/components/editor/ImageLayerControls";
import { drawFX } from "@/lib/editor/visualFxCanvas";

vi.mock("@/lib/editor/visualFxCanvas", async importOriginal => ({...await importOriginal<typeof import("@/lib/editor/visualFxCanvas")>(), prepareFX:vi.fn(), drawFX:vi.fn()}));
let frames: Map<number, FrameRequestCallback>, next: number;
beforeEach(() => {
  vi.stubGlobal("React", React);
  frames = new Map(); next = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frames.set(++next, callback); return next; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({setTransform:vi.fn(), clearRect:vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.stubGlobal("matchMedia", vi.fn(() => ({matches:false, addEventListener:vi.fn(), removeEventListener:vi.fn()})));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const advance = (time: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); });
const image = () => ({...defaultImage("", "Image"), burstEffect:"fxImpact" as const});
it("ends one-shot rendering, ignores unrelated changes and cancels on unmount", () => {
  const layer = image(); const view = render(<VisualFX layer={layer}/>);
  expect(frames.size).toBe(1); advance(0); advance(900);
  expect(frames.size).toBe(0);
  view.rerender(<VisualFX layer={{...layer, x:22, name:"renamed"}}/>);
  expect(frames.size).toBe(0);
  view.rerender(<VisualFX layer={{...layer, fxSpread:150}}/>);
  expect(frames.size).toBe(1); view.unmount(); expect(frames.size).toBe(0);
});
it("Replay FX only restarts the selected preview without changing project data", () => {
  const first = image(), second = image(), onChange = vi.fn(); const before = JSON.stringify(first);
  const view = render(<FXReplayProvider><ImageLayerControls layer={first} onChange={onChange} onReplace={vi.fn()}/><VisualFX layer={first} preview/><VisualFX layer={second} preview/><VisualFX layer={first}/></FXReplayProvider>);
  advance(0); advance(1000); vi.mocked(drawFX).mockClear();
  fireEvent.click(view.getByText("Replay FX"));
  expect(frames.size).toBe(1);
  expect(drawFX).toHaveBeenCalledTimes(2); // Both planes are prepared before paint.
  vi.mocked(drawFX).mockClear();advance(1100);
  expect(drawFX).toHaveBeenCalledTimes(2);
  expect(onChange).not.toHaveBeenCalled(); expect(JSON.stringify(first)).toBe(before);
});
it("replays on slide remount even when the effect and image ID repeat", () => {
  const layer = image(); const view = render(<div key="slide-one"><VisualFX layer={layer}/></div>);
  advance(0); advance(1000); expect(frames.size).toBe(0);
  view.rerender(<div key="slide-two"><VisualFX layer={layer}/></div>); expect(frames.size).toBe(1);
  advance(1100); advance(2200);
  view.rerender(<div key="slide-one"><VisualFX layer={layer}/></div>); expect(frames.size).toBe(1);
});
it("does not schedule disabled, invisible or reduced-motion FX", () => {
  const layer = image(); const view = render(<VisualFX layer={{...layer, fxOpacity:0}}/>);
  expect(frames.size).toBe(0);
  vi.mocked(window.matchMedia).mockReturnValue({matches:true, addEventListener:vi.fn(), removeEventListener:vi.fn()} as unknown as MediaQueryList);
  view.rerender(<VisualFX layer={layer}/>); expect(frames.size).toBe(0);
});
it("stops promptly when the tab becomes hidden", () => {
  render(<VisualFX layer={image()}/>); expect(frames.size).toBe(1);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange")); expect(frames.size).toBe(0);
});

it("retains both canvases and the PNG through the requested effect switching sequence", () => {
  const layer=image();
  const content=(effect: typeof layer.burstEffect | "none" | "fxElectric" | "fxFireBurst" | "fxSpark") => <><ImageContent layer={{...layer,imageUrl:"fixture.png",name:"Gift"}}/><VisualFX layer={{...layer,burstEffect:effect}}/></>;
  const view=render(content("none")),canvases=Array.from(view.container.querySelectorAll("canvas")),png=view.getByAltText("Gift");
  expect(canvases).toHaveLength(2);
  for(const effect of ["fxElectric","fxFireBurst","fxSpark","fxImpact","none"] as const){
    vi.mocked(drawFX).mockClear();view.rerender(content(effect));
    expect(Array.from(view.container.querySelectorAll("canvas"))).toEqual(canvases);
    expect(view.getByAltText("Gift")).toBe(png);
    if(effect==="none") {expect(frames.size).toBe(0);expect(canvases.every(c=>c.hidden&&c.width===1&&c.height===1)).toBe(true)}
    else {expect(frames.size).toBe(1);expect(drawFX).toHaveBeenCalledTimes(2);expect(vi.mocked(drawFX).mock.calls.every(call=>call[2]===0)).toBe(true)}
  }
});
it("does not reset backing dimensions for color, opacity, speed or replay changes",()=>{
  const layer=image();let current=layer;
  const content=()=> <FXReplayProvider><ImageLayerControls layer={current} onChange={vi.fn()} onReplace={vi.fn()}/><VisualFX layer={current} preview/></FXReplayProvider>;
  const view=render(content()),canvas=view.container.querySelector("canvas")!;
  const width=vi.spyOn(canvas,"width","set"),height=vi.spyOn(canvas,"height","set");
  for(const patch of [{fxPrimaryColor:"#90ffee"},{fxSecondaryColor:"#ee4400"},{fxOpacity:45},{burstSpeed:1.8}]){current={...current,...patch};view.rerender(content())}
  fireEvent.click(view.getByText("Replay FX"));
  expect(width).not.toHaveBeenCalled();expect(height).not.toHaveBeenCalled();
});
import * as imageShape from "@/lib/editor/imageShape";

it("waits for alpha analysis and ignores an image result after replacement or unmount",async()=>{
 const pending:Array<(shape:imageShape.ImageShape|null)=>void>=[];
 vi.spyOn(imageShape,"loadImageShape").mockImplementation(()=>new Promise(resolve=>pending.push(resolve)));
 const layer={...image(),imageUrl:"first.png"};const view=render(<VisualFX layer={layer}/>);
 expect(frames.size).toBe(0);
 view.rerender(<VisualFX layer={{...layer,imageUrl:"second.png"}}/>);
 await act(async()=>pending[0](null));expect(frames.size).toBe(0);
 await act(async()=>pending[1](null));expect(frames.size).toBe(1);
 view.rerender(<VisualFX layer={{...layer,imageUrl:"third.png"}}/>);expect(frames.size).toBe(0);
 view.unmount();await act(async()=>pending[2](null));expect(frames.size).toBe(0);
});
it("does not animate a fully transparent or fully cropped image",async()=>{
 vi.spyOn(imageShape,"loadImageShape").mockResolvedValue({width:96,height:96,points:[],edges:[]});
 await act(async()=>{render(<VisualFX layer={{...image(),imageUrl:"empty.png"}}/>)});
 expect(frames.size).toBe(0);
});
