import { seededRandom, type FXScene } from "./visualFxParticles";

// Textures are made once per palette/variant and retained by each active scene.
// Volume detail is painted into small bitmaps instead of using per-frame filters.
const cache = new Map<string, HTMLCanvasElement>();
const clamp = (v: number) => Math.max(0,Math.min(1,v));
function texture(key:string,w:number,h:number,paint:(ctx:CanvasRenderingContext2D)=>void) {
  const existing=cache.get(key);if(existing)return existing;
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  paint(canvas.getContext("2d")!);
  if(cache.size>=32)cache.delete(cache.keys().next().value!);
  cache.set(key,canvas);return canvas;
}
function noiseField(variant:number) {
  const random=seededRandom(`volume-${variant}`),grid=new Float32Array(64*64);
  for(let i=0;i<grid.length;i++)grid[i]=random();
  return (x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const a=grid[(iy&63)*64+(ix&63)],b=grid[(iy&63)*64+((ix+1)&63)],c=grid[((iy+1)&63)*64+(ix&63)],d=grid[((iy+1)&63)*64+((ix+1)&63)];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  };
}
function cloud(variant:number,blast:boolean) {
  return texture(`cloud-${variant}-${blast}`,128,128,ctx=>{
    const noise=noiseField(variant),pixels=ctx.createImageData(128,128);
    const field=(x:number,y:number)=>{
      const n=noise(x*5+3,y*5+9)*.62+noise(x*11,y*11)*.27+noise(x*23,y*23)*.11;
      const dx=(x-.5)*2,dy=(y-.5)*2;
      return blast?clamp((1-Math.hypot(dx,dy)+n*.7-.4)*1.6):clamp((1-Math.hypot(dx,dy))*1.05+(n-.5)*.55);
    };
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const nx=x/127,ny=y/127,density=field(nx,ny),edge=clamp(Math.min(x,y,127-x,127-y)/9);
      const normal=clamp(.6+(field(nx-.018,ny-.025)-density)*(blast?3.5:1.5));
      const grain=noise(nx*40,ny*40),shade=(blast?65+normal*150:100+normal*90)+noise(nx*9,ny*9)*35+grain*6;
      const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=shade;
      pixels.data[i+3]=255*Math.pow(density,blast?.8:1.5)*edge*edge;
    }
    ctx.putImageData(pixels,0,0);
  });
}
function tintedCloud(color:string,variant:number,blast:boolean) {
  return texture(`smoke-${color}-${variant}-${blast}`,128,128,ctx=>{
    const source=cloud(variant,blast);ctx.drawImage(source,0,0);ctx.globalCompositeOperation="multiply";
    ctx.fillStyle=color;ctx.fillRect(0,0,128,128);ctx.globalCompositeOperation="destination-in";ctx.drawImage(source,0,0);
  });
}
function colorRGB(color:string):number[] {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=1;
  const ctx=canvas.getContext("2d")!;ctx.fillStyle="#ffffff";ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
  return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);
}
function flame(primary:string,secondary:string,variant:number) {
  return texture(`fire-${primary}-${secondary}-${variant}`,128,192,ctx=>{
    const hot=colorRGB(primary),outer=colorRGB(secondary),noise=noiseField(variant+8),pixels=ctx.createImageData(128,192);
    for(let y=0;y<192;y++)for(let x=0;x<128;x++) {
      const height=1-y/191,nx=x/127*2-1;
      const curl=Math.sin(height*8+variant*2)*.18*height+Math.sin(height*19+variant)*.055;
      const width=.44*Math.pow(1-height,.65)+.012;
      const turbulence=noise(x/24,y/32)*.43+noise(x/9,y/13)*.17;
      const density=clamp((1-Math.abs(nx-curl)/width+turbulence-.4)*1.6);
      const core=clamp(Math.pow(density,2)*(.55+.45*noise(x/13,y/19))*(1-height*.72)*1.8),white=core*core*.16;
      const i=(y*128+x)*4;
      for(let c=0;c<3;c++)pixels.data[i+c]=(outer[c]+(hot[c]-outer[c])*core)*(1-white)+255*white;
      pixels.data[i+3]=230*Math.pow(density,1.2)*clamp((1-height)*14)*clamp(height*18);
    }
    ctx.putImageData(pixels,0,0);
  });
}
function light(color:string) {
  return texture(`light-${color}`,96,96,ctx=>{
    const g=ctx.createRadialGradient(48,48,0,48,48,48);
    g.addColorStop(0,"#ffffff");g.addColorStop(.06,color);g.addColorStop(.18,color);g.addColorStop(1,"transparent");
    ctx.fillStyle=g;ctx.fillRect(0,0,96,96);
  });
}
function streak(primary:string,secondary:string) {
  return texture(`streak-${primary}-${secondary}`,160,32,ctx=>{
    const hot=colorRGB(primary),outer=colorRGB(secondary),pixels=ctx.createImageData(160,32);
    for(let y=0;y<32;y++)for(let x=0;x<160;x++){
      const u=x/159,v=(y-15.5)/16,core=Math.exp(-v*v/(.0015+.008*u)),halo=Math.exp(-v*v/.11);
      const head=Math.exp(-(((u-.95)/.05)**2)),brightness=clamp((core*.9+halo*.16)*Math.sqrt(u)*clamp((1-u)*22)+head*halo*.5);
      const i=(y*160+x)*4,mix=clamp(core*.8+head*.2);
      for(let c=0;c<3;c++)pixels.data[i+c]=outer[c]+(hot[c]-outer[c])*mix;
      pixels.data[i+3]=brightness*255;
    }
    ctx.putImageData(pixels,0,0);
  });
}
export function prepareFX(scene:FXScene) {
  // Let Canvas normalize valid CSS colors and safely reject malformed imported strings.
  const probe=document.createElement("canvas").getContext("2d")!;
  probe.fillStyle="#ffffff";probe.fillStyle=scene.primary;const primary=probe.fillStyle;
  probe.fillStyle="#ff862e";probe.fillStyle=scene.secondary;const secondary=probe.fillStyle;
  const volume=scene.effect==="fxImpact"||scene.effect==="fxSmoke";
  scene.textures={colors:[primary,secondary],light:[light(primary),light(secondary)],
    smoke:volume?[0,1].map(c=>[0,1,2].map(v=>tintedCloud(c?secondary:primary,v,scene.effect==="fxImpact"))):[],
    flame:scene.effect==="fxFireBurst"?[[0,1,2].map(v=>flame(primary,secondary,v))]:[],
    streak:scene.particles.some(p=>p.kind==="spark")?[streak(primary,secondary),streak(primary,secondary)]:[],
  };
}
