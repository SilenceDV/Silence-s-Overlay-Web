import { particleX, particleY, type FXScene, type Particle, type Arc } from "./visualFxParticles";
import { prepareFX } from "./visualFxTextures";
export { createFXScene, seededRandom } from "./visualFxParticles";
export type { FXScene } from "./visualFxParticles";
export { prepareFX } from "./visualFxTextures";

export const MAX_FX_PIXELS = 1_000_000;
export function canvasResolution(width: number, height: number, dpr: number) {
  const scale = Math.min(1.5, Math.max(.1, dpr), 1536 / Math.max(width, height), Math.sqrt(MAX_FX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
const envelope=(t:number)=>smooth(0,.045,t)*(1-smooth(.28,1,t));
function light(ctx:CanvasRenderingContext2D,texture:HTMLCanvasElement,x:number,y:number,r:number,alpha:number,stretch=1) {
  ctx.globalAlpha=clamp(alpha);ctx.drawImage(texture,x-r,y-r*stretch,r*2,r*2*stretch);
}
function spark(ctx:CanvasRenderingContext2D,scene:FXScene,p:Particle,x:number,y:number,age:number,alpha:number) {
  const textures=scene.textures!,size=p.size*(p.front?1:1.5);
  const tailAge=Math.max(0,age-p.trail),tx=particleX(p,tailAge),ty=particleY(p,tailAge);
  const length=Math.max(size*2,Math.min(180*scene.size,Math.hypot(x-tx,y-ty)));
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(y-ty,x-tx));
  // A soft textured, tapered streak: narrow hot center and low-contrast colored halo.
  ctx.globalAlpha=clamp(alpha*(p.front?1:.48));
  ctx.drawImage(textures.streak[p.secondary?1:0],-length,-size*3.2,length+size,size*6.4);
  ctx.restore();
  light(ctx,textures.light[1],x,y,size*(p.front?5:8),alpha*(p.front?.32:.12));
  if(p.front){ctx.globalAlpha=clamp(alpha);ctx.fillStyle=textures.colors[0];ctx.beginPath();ctx.arc(x,y,Math.max(.65,size*.43),0,TAU);ctx.fill();}
}
function fragment(ctx:CanvasRenderingContext2D,scene:FXScene,p:Particle,x:number,y:number,t:number,alpha:number) {
  const textures=scene.textures!,primary=textures.colors[0],secondary=textures.colors[1],ice=p.kind==="shard";
  if(ice)light(ctx,textures.light[1],x,y,p.size*1.8,alpha*.12);
  ctx.translate(x,y);ctx.rotate(p.rotation+p.spin*t);
  ctx.scale(.25+Math.abs(Math.cos(p.phase+t*5))*.75,1);
  ctx.globalAlpha=clamp(alpha);
  const face=ctx.createLinearGradient(-p.size,-p.size,p.size,p.size);
  if(ice){face.addColorStop(0,primary);face.addColorStop(.28,secondary);face.addColorStop(.49,primary);face.addColorStop(.55,secondary);face.addColorStop(1,"#143445");}
  else{face.addColorStop(0,secondary);face.addColorStop(.26,"#50443e");face.addColorStop(1,"#16171c");}
  ctx.fillStyle=face;ctx.beginPath();
  for(let i=0;i<p.shape.length;i+=2){if(i===0)ctx.moveTo(p.shape[i]*p.size,p.shape[i+1]*p.size);else ctx.lineTo(p.shape[i]*p.size,p.shape[i+1]*p.size);}
  ctx.closePath();ctx.fill();
  // Specular edge changes as the fragment tumbles; dark faces keep volume readable.
  const reflection=.2+.8*Math.max(0,Math.sin(p.phase+t*11));ctx.globalAlpha=clamp(alpha*reflection);
  ctx.strokeStyle=ice?primary:secondary;ctx.lineWidth=ice?1:.8;
  ctx.beginPath();ctx.moveTo(p.shape[0]*p.size,p.shape[1]*p.size);ctx.lineTo(p.shape[2]*p.size,p.shape[3]*p.size);ctx.lineTo(0,0);ctx.stroke();
}
function traceArc(ctx:CanvasRenderingContext2D,a:Float32Array,b:Float32Array,blend:number,reveal:number) {
  const end=Math.max(2,Math.floor((a.length/2-1)*reveal)*2);
  ctx.beginPath();ctx.moveTo(a[0]+(b[0]-a[0])*blend,a[1]+(b[1]-a[1])*blend);
  for(let i=2;i<=end;i+=2)ctx.lineTo(a[i]+(b[i]-a[i])*blend,a[i+1]+(b[i+1]-a[i+1])*blend);
}
function electricity(ctx:CanvasRenderingContext2D,scene:FXScene,arc:Arc,time:number) {
  const t=(time-arc.delay)/arc.life;if(t<0||t>=1)return;
  const frame=t*(arc.frames.length-1),index=Math.min(arc.frames.length-2,Math.floor(frame)),blend=frame-index;
  const flicker=.58+.42*Math.sin(time*185+arc.phase)**2;
  const alpha=scene.opacity*smooth(0,.025,t)*(1-smooth(.68,1,t))*flicker;
  const colors=scene.textures!.colors;
  ctx.lineCap="round";ctx.lineJoin="round";
  for(let branch=-1;branch<2;branch++){
    const a=branch<0?arc.frames[index]:arc.branches[index][branch];
    const b=branch<0?arc.frames[index+1]:arc.branches[index+1][branch];
    const width=arc.thickness*(branch<0?1:.38),opacity=alpha*(branch<0?1:.65);
    traceArc(ctx,a,b,blend,clamp(t/(branch<0?.18:.32)));
    ctx.strokeStyle=colors[1];ctx.globalAlpha=clamp(opacity*.075);ctx.lineWidth=width*15;ctx.stroke();
    ctx.globalAlpha=clamp(opacity*.22);ctx.lineWidth=width*5;ctx.stroke();
    ctx.globalAlpha=clamp(opacity*.7);ctx.lineWidth=width*2;ctx.stroke();
    ctx.strokeStyle=colors[0];ctx.globalAlpha=clamp(opacity);ctx.lineWidth=width*.65;ctx.stroke();
  }
}

/** No allocations of particle/path arrays or React updates during drawing. */
export function drawFX(ctx:CanvasRenderingContext2D,scene:FXScene,time:number,front:boolean) {
  const {width,height,padding,opacity,effect}=scene,cw=width+padding*2,ch=height+padding*2;
  ctx.setTransform(ctx.canvas.width/cw,0,0,ctx.canvas.height/ch,0,0);ctx.clearRect(0,0,cw,ch);
  if(time>=1||time<0||opacity<=0||scene.intensity<=0)return;
  if(!scene.textures)prepareFX(scene);
  const textures=scene.textures!,primary=textures.colors[0],secondary=textures.colors[1];
  ctx.save();ctx.translate(cw/2,ch/2);ctx.globalCompositeOperation="lighter";
  if(!front&&effect==="fxImpact"){
    const hit=Math.exp(-time*32),expansion=1-Math.exp(-time*12);
    light(ctx,textures.light[1],scene.originX,scene.originY,Math.max(width,height)*(.5+expansion*.35),Math.pow(1-time,3)*opacity*.62,.8);
    light(ctx,textures.light[0],scene.originX,scene.originY,Math.max(width,height)*.75,hit*opacity);
  }else if(!front&&effect==="fxFireBurst"){
    const heat=smooth(0,.075,time)*(1-smooth(.35,.95,time));
    light(ctx,textures.light[1],0,height*.05,Math.max(width,height)*.7,heat*opacity*.5,.8);
    light(ctx,textures.light[0],0,height*.12,Math.max(width,height)*.47,heat*opacity*.65,.7);
  }else if(effect==="fxSpark"){
    const flare=Math.exp(-time*18)*opacity;
    light(ctx,textures.light[1],scene.originX-width*.1,scene.originY,front?28*scene.size:width*.35,flare*(front?.8:.3));
  }
  for(const p of scene.particles){
    if(p.front!==front)continue;
    const age=time-p.delay,t=age/p.life;if(t<=0||t>=1)continue;
    const x=particleX(p,age),y=particleY(p,age);
    const alpha=envelope(t)*opacity*p.depth*p.brightness;
    ctx.save();
    ctx.globalCompositeOperation=p.kind==="smoke"||p.kind==="confetti"||p.kind==="shard"||p.kind==="debris"?"source-over":"lighter";
    if(p.kind==="spark")spark(ctx,scene,p,x,y,age,alpha);
    else if(p.kind==="blast"){
      const expansion=1-Math.exp(-t*8),r=p.size*(.35+expansion*1.7),heat=1-smooth(.12,.6,t);
      ctx.translate(x,y);ctx.rotate(p.rotation+age*.35);
      light(ctx,textures.light[1],0,0,r*1.1,alpha*heat*.38,.85);
      light(ctx,textures.smoke[1][p.variant],0,0,r,alpha*heat*.8,.85+p.phase*.04);
      light(ctx,textures.smoke[0][p.variant],-r*.05,-r*.09,r*.76,alpha*heat*.5,.82);
      ctx.globalCompositeOperation="source-over";
      light(ctx,textures.smoke[1][p.variant],0,-r*.08,r*1.1,alpha*(1-heat)*.25,.9);
    }else if(p.kind==="smoke"){
      ctx.translate(x,y);ctx.rotate(p.rotation+age*.28);
      light(ctx,textures.smoke[p.secondary?1:0][p.variant],0,0,p.size*(.5+1.6*smooth(0,1,t)),alpha*(front?.6:.85),.86+p.phase*.03);
    }else if(p.kind==="flame"){
      const r=p.size*(.65+.55*Math.sin(t*Math.PI))*(1-t*.25);
      ctx.translate(x,y);ctx.rotate(p.rotation+Math.sin(p.phase+age*5)*.1);
      light(ctx,textures.light[1],0,r*.2,r*1.2,alpha*.13,1.5);
      light(ctx,textures.flame[0][p.variant],0,0,r,alpha*1.2,1.7);
    }else if(p.kind==="shard"||p.kind==="debris")fragment(ctx,scene,p,x,y,t,alpha);
    else if(p.kind==="confetti"){
      ctx.translate(x,y);ctx.rotate(p.rotation+p.spin*age);ctx.scale(Math.cos(p.phase+age*11),1);
      ctx.globalAlpha=clamp(alpha);ctx.fillStyle=p.secondary?secondary:p.phase<2?primary:`hsl(${Math.round(p.phase*57)},85%,65%)`;
      if(p.variant===0){ctx.beginPath();ctx.moveTo(-p.size*.4,-p.size*1.7);ctx.bezierCurveTo(p.size,-p.size,-p.size,p.size,p.size*.4,p.size*1.7);ctx.lineWidth=p.size*.6;ctx.strokeStyle=ctx.fillStyle;ctx.stroke();}
      else{ctx.fillRect(-p.size/2,-p.size,p.size,p.size*1.6);ctx.globalAlpha=clamp(alpha*.5);ctx.fillStyle="#ffffff";ctx.fillRect(-p.size/2,-p.size,p.size*.14,p.size*1.6);}
    }else{
      const twinkle=.55+.45*Math.sin(p.phase+age*17)**2;
      light(ctx,textures.light[p.secondary?1:0],x,y,p.size*(p.kind==="glint"?3:5),alpha*twinkle*(front?.4:.2));
      ctx.globalAlpha=clamp(alpha*twinkle);ctx.fillStyle=primary;
      if(p.kind==="glint"){
        const r=p.size*(.3+.7*Math.sin(t*Math.PI));ctx.translate(x,y);ctx.rotate(p.rotation+age*.25);
        ctx.beginPath();ctx.moveTo(0,-r*1.5);ctx.quadraticCurveTo(r*.09,-r*.09,r,0);ctx.quadraticCurveTo(r*.09,r*.09,0,r*1.5);ctx.quadraticCurveTo(-r*.09,r*.09,-r,0);ctx.quadraticCurveTo(-r*.09,-r*.09,0,-r*1.5);ctx.fill();
      }else{ctx.beginPath();ctx.arc(x,y,p.size*(front?.4:.3),0,TAU);ctx.fill();}
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation="lighter";
  for(const arc of scene.arcs)if(arc.front===front)electricity(ctx,scene,arc,time);
  ctx.restore();
}
