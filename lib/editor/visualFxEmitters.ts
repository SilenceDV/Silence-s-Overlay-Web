import type { VisibleShape } from "./imageShape";
export type EmitterStrategy = "center" | "perimeter" | "surface" | "fullArea" | "bottomEdge" | "bottomSilhouette" | "multiPoint";
export interface FXOrigin { x:number; y:number; nx:number; ny:number; index:number }
/** Seeded art-direction regions, not equally spaced points on a mathematical ring. */
export function createEmitters(width:number,height:number,random:()=>number,shape?:VisibleShape) {
  const range=(a:number,b:number)=>a+(b-a)*random();
  const point=(x:number,y:number,index:number):FXOrigin=>({x:x*width,y:y*height,nx:x,ny:y,index});
  const origins=[point(range(-.41,-.25),range(-.38,-.18),0),point(range(.23,.4),range(-.22,-.05),1),
    point(range(-.18,.07),range(.25,.42),2),point(range(.3,.47),range(.18,.36),3),
    point(range(-.48,-.3),range(.12,.34),4),point(range(-.1,.12),range(-.48,-.32),5)];
  // Equal-width launch lanes avoid biasing a wide base toward its dense center.
  // Compute the lower envelope once per scene, using cropped visible material.
  const lower = new Map<number, {x:number;y:number}>();
  if(shape){
    const left=Math.min(...shape.points.map(p=>p.x));
    for(const p of shape.points){
      const lane=Math.min(15,Math.floor((p.x-left)/width*16));
      const previous=lower.get(lane);
      if(!previous||p.y>previous.y)lower.set(lane,p);
    }
  }
  const launchPoints=[...lower.entries()].sort((a,b)=>a[0]-b[0]).map(([,p])=>p);
  const sample=(strategy:EmitterStrategy,index=0):FXOrigin=>{
    if(strategy==="bottomSilhouette"){
      if(launchPoints.length){
        // Stratification opens across the whole base even at low intensity.
        const p=launchPoints[Math.floor(((index*.61803398875+.5)%1)*launchPoints.length)];
        return {x:p.x,y:p.y,nx:p.x/width,ny:p.y/height,index:index%6};
      }
      return point(-.44+((index*7)%16)/15*.88,range(.43,.49),index%6);
    }
    if(shape){
      const pool=strategy==="perimeter"?shape.edges:strategy==="bottomEdge"?shape.points.filter(p=>p.y>shape.height*.2):shape.points;
      const candidates=pool.length?pool:shape.points;
      if(strategy==="center"){
        // Use the innermost visible material, not transparent holes in the object.
        const target=point(range(-.12,.12),range(-.12,.12),index);
        let closest=shape.points[0],distance=Infinity;
        for(const p of shape.points){const d=(p.x-target.x)**2+(p.y-target.y)**2;if(d<distance){closest=p;distance=d;}}
        return {x:closest.x,y:closest.y,nx:closest.x/width,ny:closest.y/height,index:index%6};
      }
      const p=candidates[Math.floor(random()*candidates.length)];
      return {x:p.x,y:p.y,nx:p.x/width,ny:p.y/height,index:index%6};
    }
    switch(strategy){
      case "center":return point(range(-.1,.1),range(-.1,.1),index);
      case "surface":return point(range(-.43,.43),range(-.43,.43),index);
      case "fullArea":return point(range(-.62,.62),range(-.62,.62),index);
      case "bottomEdge":return point(range(-.47,.47),range(.34,.49),index);
      case "multiPoint":{const origin=origins[index%origins.length];return {...origin,x:origin.x+range(-.055,.055)*width,y:origin.y+range(-.05,.05)*height};}
      case "perimeter":{
        const along=range(-.48,.48),edge=range(.43,.54);
        switch(index%4){case 0:return point(along,-edge,index);case 1:return point(edge,along,index);case 2:return point(along,edge,index);default:return point(-edge,along,index);}
      }
    }
  };
  return {origins,sample};
}
