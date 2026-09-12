import type { VisibleShape } from "./imageShape";

/** Scene-local routing on the cached alpha samples. Keeps straight segments from
 * bridging a hole or a concave gap after their vertices are snapped to material.
 * All routing and allocations finish before requestAnimationFrame playback. */
export function createMaterialRouter(shape: VisibleShape) {
  const points=shape.points;
  const xs=[...new Set(points.map(p=>p.x))].sort((a,b)=>a-b);
  const ys=[...new Set(points.map(p=>p.y))].sort((a,b)=>a-b);
  const spacing=(values:number[],fallback:number)=>{
    let step=Infinity;
    for(let i=1;i<values.length;i++)if(values[i]-values[i-1]>fallback*1e-6)step=Math.min(step,values[i]-values[i-1]);
    return Number.isFinite(step)?step:fallback;
  };
  const dx=spacing(xs,shape.width),dy=spacing(ys,shape.height);
  const columns=points.map(p=>Math.round((p.x-xs[0])/dx));
  const rows=points.map(p=>Math.round((p.y-ys[0])/dy));
  const key=(x:number,y:number)=>`${x}:${y}`;
  const cells=new Map(points.map((_,i)=>[key(columns[i],rows[i]),i]));
  const at=(x:number,y:number)=>cells.get(key(Math.round((x-xs[0])/dx),Math.round((y-ys[0])/dy)));
  const neighbors=points.map((_,i)=>{
    const found:number[]=[];
    for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
      if(!x&&!y)continue;
      const n=cells.get(key(columns[i]+x,rows[i]+y));
      if(n===undefined)continue;
      if(x&&y&&(!cells.has(key(columns[i]+x,rows[i]))||!cells.has(key(columns[i],rows[i]+y))))continue;
      found.push(n);
    }
    return found;
  });
  const queue=new Int32Array(points.length),previous=new Int32Array(points.length);
  return (path:Float32Array)=>{
    const output:number[]=[path[0],path[1]];
    let last=at(path[0],path[1])!;
    for(let j=2;j<path.length;j+=2){
      const next=at(path[j],path[j+1]);if(next===undefined)continue;
      const a=points[last],b=points[next];
      const steps=Math.ceil(Math.max(Math.abs(b.x-a.x)/dx,Math.abs(b.y-a.y)/dy)*2);
      let clear=true;
      for(let s=1;s<steps;s++)if(at(a.x+(b.x-a.x)*s/steps,a.y+(b.y-a.y)*s/steps)===undefined){clear=false;break;}
      if(!clear){
        previous.fill(-1);previous[last]=last;queue[0]=last;
        let head=0,tail=1;
        while(head<tail&&previous[next]===-1){
          const current=queue[head++];
          for(const n of neighbors[current])if(previous[n]===-1){previous[n]=current;queue[tail++]=n;}
        }
        // Disconnected islands must never acquire a bolt across empty space.
        if(previous[next]===-1)continue;
        const route:number[]=[];
        for(let n=next;n!==last;n=previous[n])route.push(n);
        for(let k=route.length-1;k>0;k--){const p=points[route[k]];output.push(p.x,p.y);}
      }
      output.push(b.x,b.y);last=next;
    }
    if(output.length===2)output.push(output[0],output[1]);
    return new Float32Array(output);
  };
}
