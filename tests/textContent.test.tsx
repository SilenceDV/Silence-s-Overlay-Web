import React from "react";
import {act,cleanup,render} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {TextContent} from "@/components/editor/TextContent";
import {defaultText,defaultProject} from "@/lib/editor/defaults";
import {OverlayClient} from "@/app/o/[publicId]/OverlayClient";
import {measureTextGlyphs} from "@/lib/editor/textLayout";
import {readFileSync} from "node:fs";

vi.mock("@/lib/editor/textLayout",async importOriginal=>{
 const original=await importOriginal<typeof import("@/lib/editor/textLayout")>();
 return {...original,measureTextGlyphs:vi.fn()};
});
vi.mock("@/lib/supabase/client",()=>({createSupabaseBrowserClient:()=>{const channel={on:()=>channel,subscribe:()=>channel};return {channel:()=>channel,removeChannel:vi.fn()}}}));
vi.mock("@/components/editor/StageViewport",()=>({StageViewport:({children}:{children:React.ReactNode})=>children}));
beforeEach(()=>{vi.mocked(measureTextGlyphs).mockImplementation((_source,glyphs)=>glyphs.map((_,i)=>({x:i*31.25,y:0,width:31.25,height:60,fieldX:i*31.25,fieldWidth:glyphs.length*31.25})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();vi.clearAllMocks()});
const fills=["solid","customGradient","rainbow","aurora","fireText","iceText","goldText","gradient"] as const;
const animations=["waveLetters","bounceLetters","typewriterLetters","glitchLetters","flickerLetters"] as const;
it.each(fills)("%s + Wave separates motion from fill and stroke",effect=>{
 const {container}=render(<TextContent layer={{...defaultText("WAVE"),effect,textAnimation:"waveLetters"}}/>);
 const root=container.querySelector(".layerText")!;
 expect(root.classList.contains(effect)).toBe(false);
 expect(root.getAttribute("style")).not.toMatch(/background|webkit-text-stroke/i);
 const movers=container.querySelectorAll(".flowChar");expect(movers).toHaveLength(4);
 movers.forEach((mover,i)=>{
  expect(mover.children).toHaveLength(1);expect(mover.getAttribute("style")).toContain(`--i: ${i}`);
  expect(mover.firstElementChild!.classList.contains(effect)).toBe(true);
  expect(mover.firstElementChild!.textContent).toBe("WAVE"[i]);
 });
});
it.each(fills)("%s None and Breathing paint the actual continuous string without glyph measurement",effect=>{
 const observer=vi.fn();vi.stubGlobal("ResizeObserver",observer);
 const layer={...defaultText("SPAWN  POO\n\nSECOND LINE"),effect};
 const {container,rerender}=render(<TextContent layer={layer}/>);
 for(const textAnimation of ["none","breatheText"] as const){
  rerender(<TextContent layer={{...layer,textAnimation}}/>);
  const root=container.querySelector(".layerText")!;
  expect(root.classList.contains(textAnimation)).toBe(true);expect(root.classList.contains(effect)).toBe(true);
  expect(root.childNodes).toHaveLength(1);expect(root.firstChild!.nodeType).toBe(Node.TEXT_NODE);
  expect(root.textContent).toBe(layer.text);
  expect(container.querySelectorAll(".flowChar,.flowWord,.flowLine,.textMeasure")).toHaveLength(0);
 }
 expect(measureTextGlyphs).not.toHaveBeenCalled();expect(observer).not.toHaveBeenCalled();
});
it.each(animations)("%s alone opts into the measured outer-motion/inner-paint structure",textAnimation=>{
 const {container}=render(<TextContent layer={{...defaultText("GO"),effect:"rainbow",textAnimation,textShimmer:true}}/>);
 expect(container.querySelector(`.layerText.${textAnimation}`)).not.toBeNull();
 expect(container.querySelectorAll(".flowChar > .textGlyph.rainbow.glyphShimmer")).toHaveLength(2);
 expect(container.querySelector(".textMeasure")?.textContent).toBe("GO");
});
it.each(animations)("%s -> None completely replaces motion state with pristine static text",textAnimation=>{
 const layer={...defaultText("SPAWN POO"),effect:"rainbow" as const,textShimmer:true};
 const {container,rerender}=render(<TextContent layer={layer}/>);
 const pristine=container.innerHTML;
 rerender(<TextContent layer={{...layer,textAnimation}}/>);
 const old=container.querySelector(".layerText")!;
 expect(container.querySelectorAll(".flowChar")).toHaveLength(9);
 rerender(<TextContent layer={layer}/>);
 expect(old.isConnected).toBe(false);expect(container.innerHTML).toBe(pristine);
 expect(container.querySelectorAll(".flowChar,.textMeasure,[data-measured]")).toHaveLength(0);
 expect(container.innerHTML).not.toMatch(/--glyph|--line-width|transform|opacity/);
});
it.each(["solid","rainbow","customGradient","aurora"] as const)("%s animated shimmer is glyph-local and static shimmer stays continuous",effect=>{
 const layer={...defaultText("AB"),effect,textShimmer:true,textShimmerSpeed:.7};
 const {container,rerender}=render(<TextContent layer={{...layer,textAnimation:"waveLetters"}}/>);
 expect(container.querySelectorAll(".glyphShimmer")).toHaveLength(2);
 expect(container.querySelector(".glyphShimmer")?.getAttribute("data-glyph")).toBe("A");
 expect((container.querySelector(".layerText") as HTMLElement).style.getPropertyValue("--shimmerSpeed")).toBe("0.7s");
 rerender(<TextContent layer={{...layer,textShimmerSpeed:4}}/>);
 const root=container.querySelector(".textStatic.staticShimmer") as HTMLElement;
 expect(root.getAttribute("data-text")).toBe("AB");expect(root.textContent).toBe("AB");
 expect(root.children).toHaveLength(0);expect(root.style.getPropertyValue("--shimmerSpeed")).toBe("4s");
});
it("uses fractional browser advances including the space, rather than isolated glyph widths",()=>{
 const xs=[0,35.96875,72.78125,112.5,172.28125,219.3125,233.8125,273.9375,316.75];
 const width=359.5625;
 vi.mocked(measureTextGlyphs).mockReturnValue(xs.map((x,i)=>({x,y:0,width:(xs[i+1]??width)-x,height:64,fieldX:x,fieldWidth:width})));
 const {container}=render(<TextContent layer={{...defaultText("SPAWN POO"),textAnimation:"typewriterLetters",effect:"rainbow"}}/>);
 const chars=Array.from(container.querySelectorAll<HTMLElement>(".flowChar"));
 expect(chars.map(c=>parseFloat(c.style.left))).toEqual(xs);
 expect(chars[5].textContent).toBe(" ");expect(chars[5].style.width).toBe("14.5px");
 expect(chars[6].style.left).toBe("233.8125px");
 expect(chars.every(c=>c.style.getPropertyValue("--line-width")==="359.5625px")).toBe(true);
 expect(container.querySelector(".textMeasure")?.textContent).toBe("SPAWN POO");
});
it("remeasures on resize/fonts and disconnects when switching to the static path",async()=>{
 let resized=()=>{};const disconnect=vi.fn();
 vi.stubGlobal("ResizeObserver",class{constructor(callback:()=>void){resized=callback}observe(){}disconnect=disconnect});
 let ready=()=>{};const fonts={ready:new Promise<void>(resolve=>{ready=resolve}),addEventListener:vi.fn(),removeEventListener:vi.fn()};
 Object.defineProperty(document,"fonts",{configurable:true,value:fonts});
 const raf=vi.spyOn(window,"requestAnimationFrame");
 const layer={...defaultText("ABC"),effect:"rainbow" as const};
 const {container,rerender}=render(<TextContent layer={{...layer,textAnimation:"waveLetters"}}/>);
 expect(measureTextGlyphs).toHaveBeenCalledTimes(1);
 act(()=>resized());expect(measureTextGlyphs).toHaveBeenCalledTimes(2);
 await act(async()=>{ready();await fonts.ready});expect(measureTextGlyphs).toHaveBeenCalledTimes(3);
 expect(raf).not.toHaveBeenCalled();
 rerender(<TextContent layer={{...layer,textAnimation:"breatheText"}}/>);
 expect(container.querySelectorAll(".flowChar")).toHaveLength(0);expect(disconnect).toHaveBeenCalledOnce();
 expect(fonts.removeEventListener).toHaveBeenCalledWith("loadingdone",expect.any(Function));
 act(()=>resized());expect(measureTextGlyphs).toHaveBeenCalledTimes(3);
 Reflect.deleteProperty(document,"fonts");
});
it("preserves blank lines, spaces and complete graphemes in the animated reference",()=>{
 const text="A B\n\n👨‍👩‍👧‍👦é";
 const {container}=render(<TextContent layer={{...defaultText(text),textAnimation:"waveLetters"}}/>);
 expect(container.querySelector(".textMeasure")?.textContent).toBe(text);
 expect(container.querySelectorAll(".flowChar")).toHaveLength(5);
 expect(container.querySelectorAll(".textGlyph")[1].textContent).toBe(" ");
});
it.each(["none","breatheText","waveLetters","typewriterLetters"] as const)("hosted %s uses identical shared rendering behavior",async textAnimation=>{
 vi.stubGlobal("React",React);vi.useFakeTimers();
 const layer={...defaultText("SPAWN POO"),effect:"rainbow" as const,textAnimation,textShimmer:true};
 const project=defaultProject();project.slides=[{...project.slides[0],layers:[layer]}];
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({active:true,project})})));
 const direct=render(<TextContent layer={layer}/>);const hosted=render(<OverlayClient project={project} publicId="test"/>);
 await act(async()=>{await Promise.resolve()});
 expect(hosted.container.querySelector(".layerText")?.outerHTML).toBe(direct.container.querySelector(".layerText")?.outerHTML);
});
it("keeps measured geometry across unrelated shimmer/color renders",()=>{
 const layer={...defaultText("W"),effect:"rainbow" as const,textAnimation:"waveLetters" as const};
 const {container,rerender}=render(<TextContent layer={layer}/>);
 const mover=container.querySelector(".flowChar") as HTMLElement;
 expect(mover.style.getPropertyValue("--line-width")).toBe("31.25px");
 rerender(<TextContent layer={{...layer,textShimmer:true,textShimmerSpeed:.7,color:"#abcdef"}}/>);
 expect(mover.style.getPropertyValue("--line-width")).toBe("31.25px");expect(measureTextGlyphs).toHaveBeenCalledTimes(1);
});
it("applies wrapped-row field coordinates without changing the continuous reference layout",()=>{
 vi.mocked(measureTextGlyphs).mockReturnValue([0,20,40,0,20].map((x,i)=>({x,y:i<3?0:50,width:20,height:50,fieldX:x,fieldWidth:i<3?60:40})));
 const {container}=render(<TextContent layer={{...defaultText("A B C"),effect:"rainbow",textAnimation:"waveLetters"}}/>);
 const chars=Array.from(container.querySelectorAll<HTMLElement>(".flowChar"));
 expect(chars.map(c=>c.style.getPropertyValue("--line-width"))).toEqual(["60px","60px","60px","40px","40px"]);
 expect(chars.map(c=>c.style.top)).toEqual(["0px","0px","0px","50px","50px"]);
});
it("keeps parent paint out of animated text and clips both shimmer paths to text",()=>{
 const css=readFileSync("styles/text-content.css","utf8");
 expect(css.match(/\.layerText\{([^}]*)\}/)![1]).not.toMatch(/background|text-stroke/);
 expect(css).toContain(".textGlyph:is(.gradient,.customGradient,.rainbow,.aurora,.fireText,.iceText,.goldText)");
 expect(css).toContain(".textStatic:is(.gradient,.customGradient,.rainbow,.aurora,.fireText,.iceText,.goldText)");
 for(const [selector,attribute] of [["textGlyph\\.glyphShimmer","data-glyph"],["textStatic\\.staticShimmer","data-text"]]){
  const shimmer=css.match(new RegExp(`\\.${selector}::after\\{([^}]*)\\}`))![1];
  expect(shimmer).toContain(`content:attr(${attribute})`);expect(shimmer).toContain("background-clip:text");
  expect(shimmer).toContain("var(--shimmerSpeed,2.2s)");expect(shimmer).toContain("-webkit-text-stroke:0");
 }
 expect(css).toContain("var(--glyph-x,0px) - var(--line-width,1em)");
 expect(css).toContain("background-size:200% 100%;animation:staticRainbow 3s");
 expect(css).toContain(".textStatic.rainbow.breatheText{animation:staticRainbow");
 expect(css).toContain(".textMeasure{display:block;visibility:hidden");
});
