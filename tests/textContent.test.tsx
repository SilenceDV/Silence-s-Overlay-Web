import React from "react";
import {act,cleanup,render} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {TextContent} from "@/components/editor/TextContent";
import {defaultText,defaultProject} from "@/lib/editor/defaults";
import {OverlayClient} from "@/app/o/[publicId]/OverlayClient";
import {readFileSync} from "node:fs";

vi.mock("@/lib/supabase/client",()=>({createSupabaseBrowserClient:()=>{const channel={on:()=>channel,subscribe:()=>channel};return {channel:()=>channel,removeChannel:vi.fn()}}}));
vi.mock("@/components/editor/StageViewport",()=>({StageViewport:({children}:{children:React.ReactNode})=>children}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()});
const fills=["solid","customGradient","rainbow","aurora","fireText","iceText","goldText","gradient"] as const;
it.each(fills)("%s + Wave separates motion from fill and stroke",effect=>{
 const {container}=render(<TextContent layer={{...defaultText("WAVE"),effect,textAnimation:"waveLetters"}}/>);
 const root=container.querySelector(".layerText")!;
 expect(root.classList.contains(effect)).toBe(false);
 expect(root.getAttribute("style")).not.toMatch(/background|webkit-text-stroke/i);
 const movers=container.querySelectorAll(".flowChar");expect(movers).toHaveLength(4);
 movers.forEach((mover,i)=>{
  expect(mover.children).toHaveLength(1);
  expect(mover.getAttribute("style")).toContain(`--i: ${i}`);
  const glyph=mover.firstElementChild!;
  expect(glyph.classList.contains(effect)).toBe(true);expect(glyph.textContent).toBe("WAVE"[i]);
 });
});
it.each(["solid","rainbow","customGradient","aurora"] as const)("%s shimmer duplicates only the moving glyph and respects speed",effect=>{
 const {container,rerender}=render(<TextContent layer={{...defaultText("AB"),effect,textAnimation:"waveLetters",textShimmer:true,textShimmerSpeed:.7}}/>);
 expect(container.querySelectorAll(".glyphShimmer")).toHaveLength(2);
 expect(container.querySelector(".layerText")?.classList.contains("textShimmer")).toBe(false);
 expect(container.querySelector(".glyphShimmer")?.getAttribute("data-glyph")).toBe("A");
 expect((container.querySelector(".layerText") as HTMLElement).style.getPropertyValue("--shimmerSpeed")).toBe("0.7s");
 rerender(<TextContent layer={{...defaultText("AB"),effect,textShimmer:true,textShimmerSpeed:4}}/>);
 expect((container.querySelector(".layerText") as HTMLElement).style.getPropertyValue("--shimmerSpeed")).toBe("4s");
});
it("measures a shared field in layout coordinates and remeasures on resize, not animation frames",()=>{
 let resized=()=>{};const disconnect=vi.fn();
 vi.stubGlobal("ResizeObserver",class{constructor(callback:()=>void){resized=callback}observe(){}disconnect=disconnect});
 let width=240;
 vi.spyOn(HTMLElement.prototype,"offsetWidth","get").mockImplementation(function(this:HTMLElement){return this.classList.contains("flowLine")?width:80});
 vi.spyOn(HTMLElement.prototype,"offsetHeight","get").mockReturnValue(60);
 const read=vi.spyOn(HTMLElement.prototype,"offsetLeft","get").mockImplementation(function(this:HTMLElement){return Array.from(this.parentElement!.children).indexOf(this)*80});
 const raf=vi.spyOn(window,"requestAnimationFrame");
 const {container,unmount}=render(<TextContent layer={{...defaultText("ABC"),effect:"rainbow",textAnimation:"waveLetters"}}/>);
 const line=container.querySelector(".flowLine") as HTMLElement;
 expect(line.style.getPropertyValue("--line-width")).toBe("240px");
 expect(Array.from(container.querySelectorAll<HTMLElement>(".flowChar"),x=>x.style.getPropertyValue("--glyph-x"))).toEqual(["0px","80px","160px"]);
 expect(read).toHaveBeenCalledTimes(3);expect(raf).not.toHaveBeenCalled();
 width=300;act(()=>resized());expect(line.style.getPropertyValue("--line-width")).toBe("300px");
 unmount();expect(disconnect).toHaveBeenCalledOnce();
});
it("preserves blank lines, spaces and complete graphemes",()=>{
 const {container}=render(<TextContent layer={defaultText("A B\n\n👨‍👩‍👧‍👦é")}/>);
 expect(container.querySelectorAll(".flowLine")).toHaveLength(3);
 expect(container.querySelectorAll(".flowChar")).toHaveLength(5);
 expect(container.querySelectorAll("br")).toHaveLength(1);
 expect(container.querySelectorAll(".textGlyph")[1].textContent).toBe(" ");
});
it.each(["none","waveLetters","bounceLetters","typewriterLetters","glitchLetters","flickerLetters","breatheText"] as const)("%s retains the same paint/movement structure",textAnimation=>{
 const {container}=render(<TextContent layer={{...defaultText("GO"),effect:"rainbow",textAnimation,textShimmer:true}}/>);
 expect(container.querySelector(`.layerText.${textAnimation}`)).not.toBeNull();
 expect(container.querySelectorAll(".flowChar > .textGlyph.rainbow.glyphShimmer")).toHaveLength(2);
});
it("hosts the identical shared glyph structure in /o/[publicId]",async()=>{
 vi.stubGlobal("React",React);vi.useFakeTimers();
 const layer={...defaultText("RAINBOW"),effect:"rainbow" as const,textAnimation:"waveLetters" as const,textShimmer:true};
 const project=defaultProject();project.slides=[{...project.slides[0],layers:[layer]}];
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({active:true,project})})));
 const direct=render(<TextContent layer={layer}/>);
 const hosted=render(<OverlayClient project={project} publicId="test"/>);
 await act(async()=>{await Promise.resolve()});
 expect(hosted.container.querySelector(".layerText")?.outerHTML).toBe(direct.container.querySelector(".layerText")?.outerHTML);
});
it("paint CSS has no parent gradient, applies text clipping to every non-solid fill and clips shimmer",()=>{
 const css=readFileSync("styles/text-content.css","utf8");
 const parent=css.match(/\.layerText\{([^}]*)\}/)![1];expect(parent).not.toMatch(/background|text-stroke/);
 expect(css).toContain(".textGlyph:is(.gradient,.customGradient,.rainbow,.aurora,.fireText,.iceText,.goldText)");
 expect(css).toContain("background-clip:text");expect(css).toContain("-webkit-text-fill-color:transparent");
 const shimmer=css.match(/\.textGlyph\.glyphShimmer::after\{([^}]*)\}/)![1];
 expect(shimmer).toContain("content:attr(data-glyph)");expect(shimmer).toContain("background-clip:text");expect(shimmer).toContain("var(--shimmerSpeed,2.2s)");
 expect(css).toContain("var(--glyph-x,0px) - var(--line-width,1em)");
});

it("keeps measured geometry across unrelated shimmer/color renders",()=>{
 vi.spyOn(HTMLElement.prototype,"offsetWidth","get").mockReturnValue(100);
 vi.spyOn(HTMLElement.prototype,"offsetHeight","get").mockReturnValue(60);
 vi.spyOn(HTMLElement.prototype,"offsetLeft","get").mockReturnValue(0);
 const layer={...defaultText("W"),effect:"rainbow" as const,textAnimation:"waveLetters" as const};
 const {container,rerender}=render(<TextContent layer={layer}/>);
 const mover=container.querySelector(".flowChar") as HTMLElement;
 expect(mover.style.getPropertyValue("--line-width")).toBe("100px");
 rerender(<TextContent layer={{...layer,textShimmer:true,textShimmerSpeed:.7,color:"#abcdef"}}/>);
 expect(mover.style.getPropertyValue("--line-width")).toBe("100px");
});
it("measures separate fields for wrapped rows instead of sharing the text-box width",()=>{
 const index=(el:HTMLElement)=>Number(el.style.getPropertyValue("--i"));
 vi.spyOn(HTMLElement.prototype,"offsetWidth","get").mockImplementation(function(this:HTMLElement){return this.classList.contains("flowChar")?20:100});
 vi.spyOn(HTMLElement.prototype,"offsetHeight","get").mockReturnValue(50);
 vi.spyOn(HTMLElement.prototype,"offsetLeft","get").mockImplementation(function(this:HTMLElement){return [10,30,50,10,30][index(this)]??0});
 vi.spyOn(HTMLElement.prototype,"offsetTop","get").mockImplementation(function(this:HTMLElement){return index(this)<3?0:50});
 const {container}=render(<TextContent layer={{...defaultText("A B C"),effect:"rainbow"}}/>);
 const chars=Array.from(container.querySelectorAll<HTMLElement>(".flowChar"));
 expect(chars.map(c=>c.style.getPropertyValue("--line-width"))).toEqual(["60px","60px","60px","40px","40px"]);
 expect(chars.map(c=>c.style.getPropertyValue("--glyph-x"))).toEqual(["0px","20px","40px","0px","20px"]);
});
