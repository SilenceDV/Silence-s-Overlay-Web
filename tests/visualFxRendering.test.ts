import {afterEach,expect,it,vi} from "vitest";
import {defaultImage} from "@/lib/editor/defaults";
import {fxOptions} from "@/lib/editor/visualFx";
import {createFXScene,drawFX,prepareFX} from "@/lib/editor/visualFxCanvas";
function context(canvas:HTMLCanvasElement) {
  return {canvas,fillStyle:"#ffffff",strokeStyle:"#ffffff",globalAlpha:1,
    createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),
    getImageData:()=>({data:new Uint8ClampedArray([255,255,255,255])}),
    createLinearGradient:vi.fn(()=>({addColorStop:vi.fn()})),createRadialGradient:vi.fn(()=>({addColorStop:vi.fn()})),
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

it.each(fxOptions)("hosted %s draws without per-frame gradient or canvas creation",effect=>{
  vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockImplementation(function(this:HTMLCanvasElement){return context(this) as unknown as CanvasRenderingContext2D});
  const scene=createFXScene({...defaultImage("",""),burstEffect:effect},"hosted-cached");scene.hosted=true;
  const count=scene.particles.length;prepareFX(scene);
  expect(scene.planes![0].length+scene.planes![1].length).toBe(count);
  const ctx=context(document.createElement("canvas")),allocation=vi.spyOn(document,"createElement");
  for(let i=0;i<60;i++)for(const front of [false,true])drawFX(ctx as unknown as CanvasRenderingContext2D,scene,i/60,front);
  expect(allocation).not.toHaveBeenCalled();expect(ctx.createLinearGradient).not.toHaveBeenCalled();expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  expect(scene.particles).toHaveLength(count);
});
