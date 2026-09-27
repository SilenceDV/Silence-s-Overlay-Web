import {afterEach,expect,it,vi} from "vitest";
import {defaultImage} from "@/lib/editor/defaults";
import {fxOptions} from "@/lib/editor/visualFx";
import {canvasResolution,createFXScene,drawFX,prepareFX,HOSTED_FX_CANVAS_PROFILE} from "@/lib/editor/visualFxCanvas";
function context(canvas:HTMLCanvasElement) {
  return {canvas,fillStyle:"#ffffff",strokeStyle:"#ffffff",globalAlpha:1,
    createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),
    getImageData:()=>({data:new Uint8ClampedArray([255,255,255,255])}),
    createLinearGradient:()=>({addColorStop:vi.fn()}),createRadialGradient:()=>({addColorStop:vi.fn()}),
    putImageData:vi.fn(),setTransform:vi.fn(),clearRect:vi.fn(),save:vi.fn(),restore:vi.fn(),
    translate:vi.fn(),rotate:vi.fn(),scale:vi.fn(),drawImage:vi.fn(),fillRect:vi.fn(),
    beginPath:vi.fn(),closePath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),arc:vi.fn(),
    quadraticCurveTo:vi.fn(),bezierCurveTo:vi.fn(),fill:vi.fn(),stroke:vi.fn(),
  };
}
afterEach(()=>vi.restoreAllMocks());
it.each(fxOptions)("%s retains textures during frames and clears after its lifetime",effect=>{
  vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockImplementation(function(this:HTMLCanvasElement){return context(this) as unknown as CanvasRenderingContext2D});
  const s=createFXScene({...defaultImage("",""),burstEffect:effect},"cached"),canvas=document.createElement("canvas"),ctx=context(canvas);
  prepareFX(s);const textures=s.textures;
  const allocation=vi.spyOn(document,"createElement");
  for(const time of [.08,.2,.4,.7]){drawFX(ctx as unknown as CanvasRenderingContext2D,s,time,false);drawFX(ctx as unknown as CanvasRenderingContext2D,s,time,true)}
  expect(s.textures).toBe(textures);expect(allocation).not.toHaveBeenCalled();
  ctx.clearRect.mockClear();ctx.drawImage.mockClear();ctx.stroke.mockClear();
  drawFX(ctx as unknown as CanvasRenderingContext2D,s,1,false);
  drawFX(ctx as unknown as CanvasRenderingContext2D,s,1,true);
  expect(ctx.clearRect).toHaveBeenCalledTimes(2);expect(ctx.drawImage).not.toHaveBeenCalled();expect(ctx.stroke).not.toHaveBeenCalled();
});

it("keeps hosted VFX canvases inside the lower rendering budget",()=>{
  const full=canvasResolution(1920,1080,2);
  const hosted=canvasResolution(1920,1080,2,HOSTED_FX_CANVAS_PROFILE);
  expect(hosted.width).toBeLessThan(full.width);
  expect(hosted.height).toBeLessThan(full.height);
  expect(hosted.width).toBeLessThanOrEqual(HOSTED_FX_CANVAS_PROFILE.maxLongEdge);
  expect(hosted.width*hosted.height).toBeLessThanOrEqual(HOSTED_FX_CANVAS_PROFILE.maxPixels);
});
