import type { ImageLayer } from "@/types/editor";

export interface ShapePoint { x:number; y:number; weight:number }
export interface ImageShape {
  width:number; height:number; points:ShapePoint[]; edges:ShapePoint[];
}
export interface VisibleShape {
  width:number; height:number; x:number; y:number;
  points:ShapePoint[]; edges:ShapePoint[];
}
/** At most 96² alpha samples, once per decoded source. Never persisted in projects. */
export function analyzeAlpha(data:Uint8ClampedArray,width:number,height:number):ImageShape {
  const points:ShapePoint[]=[],edges:ShapePoint[]=[];
  const alpha=(x:number,y:number)=>x<0||y<0||x>=width||y>=height?0:data[(y*width+x)*4+3];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const weight=alpha(x,y)/255;if(weight<.08)continue;
    const p={x:(x+.5)/width,y:(y+.5)/height,weight};points.push(p);
    if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>alpha(a,b)<20))edges.push(p);
  }
  return {width,height,points,edges};
}
const cache=new Map<string,Promise<ImageShape|null>>();
export function loadImageShape(url:string):Promise<ImageShape|null> {
  const found=cache.get(url);if(found){cache.delete(url);cache.set(url,found);return found;}
  const result=new Promise<ImageShape|null>(resolve=>{
    const image=new Image();image.crossOrigin="anonymous";
    const timer=setTimeout(()=>{image.onload=image.onerror=null;resolve(null)},8000);
    image.onerror=()=>{clearTimeout(timer);resolve(null)};
    image.onload=()=>{
      clearTimeout(timer);
      try{
        const ratio=Math.min(1,96/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
        const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx){resolve(null);return;}
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        const shape=analyzeAlpha(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
        // Preserve the exact source aspect ratio, independent of sample rounding.
        shape.width=image.naturalWidth;shape.height=image.naturalHeight;resolve(shape);
      }catch{resolve(null)} // CORS-tainted sources retain normal DOM rendering.
    };
    image.src=url;
  });
  cache.set(url,result);if(cache.size>48)cache.delete(cache.keys().next().value!);
  return result;
}
/** Match .layerImg's contain, center, zoom, translation and layerClip cropping. */
export function projectImageShape(shape:ImageShape,layer:ImageLayer):VisibleShape|null {
  const w=layer.w*19.2,h=layer.h*10.8;
  const scale=Math.min(layer.imageWidth*19.2/shape.width,layer.imageHeight*10.8/shape.height)*layer.cropZoom/100;
  const iw=shape.width*scale,ih=shape.height*scale;
  const project=(p:ShapePoint)=>({x:(p.x-.5)*iw+layer.cropX,y:(p.y-.5)*ih+layer.cropY,weight:p.weight});
  const inside=(p:ShapePoint)=>Math.abs(p.x)<=w/2&&Math.abs(p.y)<=h/2;
  const points=shape.points.map(project).filter(inside);
  if(!points.length)return null;
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,total=0,x=0,y=0;
  for(const p of points){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);total+=p.weight;x+=p.x*p.weight;y+=p.y*p.weight;}
  x/=total;y/=total;
  const center=(p:ShapePoint)=>({...p,x:p.x-x,y:p.y-y});
  const edges=shape.edges.map(project).filter(inside);
  return {width:Math.max(1,right-left),height:Math.max(1,bottom-top),x,y,points:points.map(center),edges:(edges.length?edges:points).map(center)};
}
