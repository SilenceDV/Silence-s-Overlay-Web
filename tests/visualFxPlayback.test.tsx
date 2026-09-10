import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultImage } from "@/lib/editor/defaults";
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
  expect(frames.size).toBe(1); advance(1100);
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
