import {cleanup,render} from "@testing-library/react";
import React from "react";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {CanvasStage,legacyImageGeometry} from "@/components/editor/CanvasStage";
import {defaultImage,defaultProject} from "@/lib/editor/defaults";
import type {EditorApi} from "@/hooks/useEditorState";

const api={selectLayer:()=>undefined} as unknown as EditorApi;
beforeAll(()=>vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}}));
afterEach(cleanup);

describe("hosted image rendering parity",()=>{
 it.each([
  ["landscape PNG","/landscape.png",4096,2160],
  ["portrait PNG","/portrait.png",2160,4096],
  ["square transparent PNG","/transparent.png",2048,2048],
  ["base64 PNG","data:image/png;base64,iVBORw0KGgo=",6000,4000],
 ])("contains the full uncropped %s regardless of stored dimensions",(_name,imageUrl,imageWidth,imageHeight)=>{
  const layer={...defaultImage(imageUrl,"fixture.png"),w:32,h:44,imageWidth,imageHeight,fit:"contain" as const};
  expect(legacyImageGeometry(layer)).toMatchObject({width:"100%",height:"100%",objectFit:"contain",transform:"translate(0px,0px) scale(1)"});
  const project=defaultProject();project.slides[0].layers=[layer];
  const view=render(<CanvasStage slide={project.slides[0]} settings={project.settings} selected={null} api={api}/>);
  const image=view.getByAltText("fixture.png") as HTMLImageElement;
  expect(image.getAttribute("src")).toBe(imageUrl);
  expect(image.style.width).toBe("100%");expect(image.style.height).toBe("100%");expect(image.style.objectFit).toBe("contain");
 });

 it("matches legacy intentional-crop inner dimensions, offset, and zoom",()=>{
  const layer={...defaultImage("/large.png","large.png"),w:25,h:20,imageWidth:50,imageHeight:30,fit:"cover" as const,cropX:42,cropY:-18,cropZoom:175};
  expect(legacyImageGeometry(layer)).toEqual({width:"200%",height:"150%",objectFit:"contain",transform:"translate(42px,-18px) scale(1.75)"});
 });

 it("never makes a crop canvas smaller than its clipping box",()=>{
  const layer={...defaultImage("/image.png","image.png"),w:40,h:30,imageWidth:12,imageHeight:8,fit:"cover" as const};
  expect(legacyImageGeometry(layer)).toMatchObject({width:"100%",height:"100%"});
 });
});
