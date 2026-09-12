import type { VisibleShape } from "./imageShape";
import { createEmitters, type FXOrigin } from "./visualFxEmitters";
import type { ImageLayer } from "@/types/editor";
import { particleEffect, type ParticleEffect } from "./visualFx";

const TAU = Math.PI * 2;
export function seededRandom(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export type ParticleKind = "blast" | "smoke" | "spark" | "flame" | "debris" | "shard" | "glint" | "mote" | "confetti";
export interface Particle {
  kind: ParticleKind; front: boolean; x: number; y: number; vx: number; vy: number;
  size: number; depth: number; z: number; vz: number; delay: number; life: number; rotation: number; spin: number;
  phase: number; gravity: number; drag: number; sway: number; brightness: number; trail: number;
  secondary: boolean; variant: number; originIndex:number; shape: Float32Array;
}
export interface Arc {
  frames: Float32Array[]; branches: Float32Array[][];
  delay: number; life: number; front: boolean; thickness: number; phase: number;
}
export interface FXTextures {
  light: HTMLCanvasElement[]; smoke: HTMLCanvasElement[][]; flame: HTMLCanvasElement[][];
  streak: HTMLCanvasElement[]; colors: string[];
}
export interface FXScene {
  textures?: FXTextures; effect: ParticleEffect; particles: Particle[]; arcs: Arc[];
  width: number; height: number; padding: number; primary: string; secondary: string;
  size: number; opacity: number; intensity: number; originX: number; originY: number; origins:FXOrigin[]; shockwaveOnly:boolean;
}
// Time is measured in fractions of the whole effect, not each particle's lifetime.
// This is the analytic solution of dv/dt = acceleration - drag * velocity.
export function displacement(velocity: number, acceleration: number, drag: number, age: number) {
  const travel = -Math.expm1(-drag * age) / drag;
  return velocity * travel + acceleration * (age - travel) / drag;
}
/** Bounded perspective: foreground objects approach; distant particles recede.
 * Projection is anchored at each emitter, never at a shared radial center. */
export function particleScale(p: Particle, age: number) {
  return 1 / (1 - Math.max(-.8, Math.min(.48, p.z + p.vz * age)));
}
export function particleX(p: Particle, age: number) {
  return p.x + (displacement(p.vx, 0, p.drag, age) + p.sway * (Math.sin(p.phase + age * 7) - Math.sin(p.phase))) * particleScale(p, age);
}
export function particleY(p: Particle, age: number) {
  return p.y + displacement(p.vy, p.gravity, p.drag, age) * particleScale(p, age);
}

/** Each preset owns its emission layout. No perimeter ring is shared between effects. */
export function createFXScene(layer: ImageLayer, seed = layer.id, shape?:VisibleShape): FXScene {
  const r = seededRandom(seed + layer.burstEffect), range = (a: number, b: number) => a + (b - a) * r();
  const bell = () => (r() + r() + r() - 1.5) / 1.5;
  const effect = particleEffect(layer.burstEffect);
  const size = Math.max(.5, Math.min(2, layer.fxSize / 100));
  const spread = Math.max(.25, Math.min(2, (layer.fxSpread ?? 100) / 100));
  const intensity = Math.max(0, Math.min(1.5, layer.fxIntensity / 100));
  const width = shape?.width ?? Math.max(1, layer.w * 19.2), height = shape?.height ?? Math.max(1, layer.h * 10.8);
  const unit = Math.max(8, Math.min(480, Math.sqrt(width*height)));
  const force = unit * 1.9 * spread;
  const emitters=createEmitters(width,height,r,shape);
  const scene: FXScene = {effect, particles:[], arcs:[], width, height, padding:0, size, intensity,
    primary:layer.fxPrimaryColor, secondary:layer.fxSecondaryColor, opacity:layer.fxOpacity / 100,
    originX:shape?.x??0, originY:shape?.y??0, origins:emitters.origins,shockwaveOnly:layer.burstEffect==="fxShockwave"};
  const proportion=unit/300;
  const count = (n: number) => Math.round(n * intensity);
  const add = (kind: ParticleKind, front: boolean, values: Partial<Particle>) => {
    const p: Particle = {kind,front,x:0,y:0,vx:0,vy:0,size:range(2,5)*size,
      depth:front?range(.8,1.25):range(.45,.75),z:0,vz:0,delay:range(0,.08),life:range(.6,.88),
      rotation:range(0,TAU),spin:range(-10,10),phase:range(0,TAU),gravity:160,drag:range(1,3),
      sway:0,brightness:range(.7,1.3),trail:range(.025,.12),secondary:r()<.6,variant:Math.floor(r()*3),
      originIndex:0,shape:new Float32Array(0),...values};
    // All sizes and accelerations track the visible content, including tiny PNGs.
    if(!["blast","smoke","flame"].includes(kind))p.size*=proportion;
    p.gravity*=proportion;p.sway*=proportion;
    if(shape&&kind!=="flame"){p.vx*=width/unit;p.vy*=height/unit;p.gravity*=height/unit;p.sway*=width/unit;}
    p.life = Math.min(p.life, 1 - p.delay);
    // Use existing seeded variation so palettes/replay do not alter geometry.
    const near=front&&p.phase<2.5,volume=kind==="flame"||kind==="smoke"||kind==="blast";
    p.z=volume?-.08:front?(near?-.04:-.22):-.4;
    p.vz=volume?.12:near?.85+p.phase*.055:front?.22:-.2;
    if(near&&(kind==="shard"||kind==="debris"||kind==="confetti"||kind==="glint"))p.size*=1.35;
    if(kind==="spark"&&effect==="fxFireBurst"){p.z=-.2;p.vz=.12}
    if (kind === "shard" || kind === "debris") {
      p.shape = new Float32Array(10);
      for (let j=0;j<5;j++) {const angle=j/5*TAU+range(-.22,.22), radius=range(.5,1);p.shape[j*2]=Math.cos(angle)*radius;p.shape[j*2+1]=Math.sin(angle)*radius*(kind==="shard"?1.8:1);}
    }
    scene.particles.push(p);
  };

  if (scene.shockwaveOnly) {
    for(let i=0;i<count(12);i++){const o=emitters.sample("perimeter",i);add("mote",false,{x:o.x,y:o.y,vx:o.nx*force*.3,vy:o.ny*force*.3,gravity:0,size:range(1,3)*size,delay:range(.03,.18),life:range(.4,.75)})}
  } else if (effect === "fxImpact") {
    // Core flash, compact cloud, crossing fragments, then residual sparks.
    for (let i=0;i<count(9);i++) {
      const o=emitters.sample("center",i);
      const angle=Math.atan2(o.ny,o.nx)+range(-.7,.7),speed=range(.3,.8)*force;
      add("blast",i%3===0,{x:o.x,y:o.y,originIndex:o.index,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed*.65-35,drag:range(5,9),gravity:-35,
        size:unit*range(.16,.26)*size,delay:range(.015,.065),life:range(.65,.9),sway:range(8,22)});
    }
    for (let i=0;i<count(14);i++) {
      const o=emitters.sample("center",i),cross=false;
      const angle=Math.atan2(cross?-o.ny:o.ny,cross?-o.nx:o.nx)+bell()*1.1,speed=force*range(.45,1.2);
      add("spark",i%5!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,drag:range(2.2,5),gravity:range(140,300),
        delay:range(.065,.16),life:range(.35,.7),size:range(2,4.5)*size,trail:range(.035,.12),sway:range(5,20)});
    }
    for (let i=0;i<count(14);i++) {
      const o=emitters.sample("surface",i);
      add("spark",i%4!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:bell()*force*.9,vy:range(-.6,.3)*force,gravity:range(100,260),drag:range(2,4),
        delay:range(.2,.4),life:range(.25,.56),size:range(.8,1.8)*size,trail:range(.012,.035)});
    }
    for (let i=0;i<count(10);i++) {
      const o=emitters.sample("center",i),angle=Math.atan2(o.ny,o.nx)+range(-.8,.8);
      add("debris",true,{x:o.x,y:o.y,originIndex:o.index,
        vx:Math.cos(angle)*force*range(.45,1),vy:Math.sin(angle)*force*.6-unit*.12,drag:range(1,2),gravity:380,
        delay:range(.08,.16),life:range(.55,.8),size:range(12,22)*size});
    }
  } else if (effect === "fxSpark") {
    // Fewer hot tapered trails erupt from the visible core.
    for (let i=0;i<Math.min(20,count(16));i++) {
      const front=i%5!==0,o=emitters.sample("center",i);
      const inward=false,angle=Math.atan2(inward?-o.ny:o.ny,inward?-o.nx:o.nx)+bell()*.95;
      const speed=force*range(.65,1.5);
      add("spark",front,{x:o.x,y:o.y,originIndex:o.index,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,drag:range(1.4,4.5),gravity:range(130,340),
        delay:range(.015,.075),life:range(.3,.78),size:range(2,4.3)*size,
        brightness:range(.8,1.6),trail:range(.035,.13),sway:range(10,30)});
    }
    for (let i=0;i<count(8);i++) {
      const o=emitters.sample("surface",i);
      add("spark",i%4!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:range(-.8,1.1)*force,vy:range(-1.1,.3)*force,drag:range(2,5),gravity:range(80,200),
        delay:range(.13,.36),life:range(.2,.6),size:range(.8,1.6)*size,trail:range(.009,.035),sway:range(2,9)});
    }
  } else if (effect === "fxFireBurst") {
    for (let i=0;i<count(23);i++) {
      const o=emitters.sample("bottomEdge",i);

      add("flame",false,{x:o.x,y:o.y,originIndex:o.index,vx:bell()*force*.14,vy:-height*range(.3,.65)*spread,
        gravity:-90,drag:range(.55,1.1),sway:range(9,25),size:Math.min(unit,Math.min(width,height)*1.6)*range(.24,.34)*size,
        delay:range(0,.16),life:range(.67,.84),rotation:range(-.2,.2)});
    }
    for (let i=0;i<count(8);i++) {
      const o=emitters.sample("bottomEdge",i);
      add("spark",i%3!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:bell()*force*.35,vy:-force*range(.6,1.5),gravity:-45,drag:range(.6,1.8),
        delay:range(.1,.4),life:range(.35,.59),size:range(.5,1.3)*size,trail:range(.009,.03),sway:range(1,6)});
    }
  } else if (effect === "fxSmoke") {
    for (let i=0;i<count(28);i++) {
      const front=i%4===0,o=emitters.sample(front?"multiPoint":"perimeter",front?Math.floor(i/4):Math.floor(i/2));
      add("smoke",front,{x:o.x,y:o.y,originIndex:o.index,
        vx:bell()*force*.32,vy:range(-100,-45)*spread*proportion,gravity:-55,drag:range(.8,1.8),sway:range(12,35),
        size:unit*range(.24,.43)*size,delay:range(0,.15),life:range(.75,.85),brightness:front?.45:.9});
    }
  } else if (effect === "fxIceShatter") {
    for (let i=0;i<count(26);i++) {
      const angle=range(0,TAU),speed=force*range(.3,.9);
      const o=emitters.sample("center",i);
      add("shard",i%7!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-unit*.18,gravity:200,drag:range(.7,2),
        size:range(9,25)*size,delay:range(.02,.11),life:range(.65,.86)});
    }
    for (let i=0;i<count(16);i++){const o=emitters.sample("surface",i);add("glint",i%5!==0,{x:o.x,y:o.y,
      vx:bell()*force*.3,vy:bell()*force*.2,gravity:140,drag:1.4,size:range(1.5,4)*size,delay:range(.2,.36),life:range(.35,.6)});}
  } else if (effect === "fxMagic") {
    for (let i=0;i<count(26);i++) {
      const o=emitters.sample("surface",i);
      add(i%3===0?"glint":"mote",i%4!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:range(-30,55)*spread*proportion,vy:range(-85,-30)*spread*proportion,gravity:-15,drag:range(.4,1.1),sway:range(10,40),
        size:(i%3===0?range(4,8):range(1,2.5))*size,delay:range(.01,.47),life:range(.32,.53)});
    }
  } else if (effect === "fxConfetti") {
    for (let i=0;i<count(44);i++) {
      const o=emitters.sample("center",i);
      add("confetti",i%3!==0,{x:o.x,y:o.y,originIndex:o.index,
        vx:bell()*force*1.1,vy:-force*range(.5,1.7),gravity:650,drag:range(.5,1.1),sway:range(10,35),
        size:range(5,12)*size,secondary:r()<.25,delay:range(0,.13),life:range(.74,.87),spin:range(-16,16)});
    }
  } else if (effect === "fxElectric") {
    const makePath = (sx:number,sy:number,ex:number,ey:number,roughness:number) => {
      const points=new Float32Array(66);points[0]=sx;points[1]=sy;points[64]=ex;points[65]=ey;
      for(let step=32;step>1;step/=2){for(let j=0;j<32;j+=step){const mid=j+step/2;
        points[mid*2]=(points[j*2]+points[(j+step)*2])/2+bell()*roughness;
        points[mid*2+1]=(points[j*2+1]+points[(j+step)*2+1])/2+bell()*roughness;
      }roughness*=.53;}
      if(shape){
        // Bend the path onto material, including around holes and concave silhouettes.
        for(let j=0;j<points.length;j+=2){
          let best=shape.points[0],distance=Infinity;
          for(const p of shape.points){const d=(p.x-points[j])**2+(p.y-points[j+1])**2;if(d<distance){distance=d;best=p;}}
          points[j]=best.x;points[j+1]=best.y;
        }
      }
      return points;
    };
    for(let i=0;i<(intensity>0?6:0);i++) {
      const front=true;
      let sx=0,sy=0,ex=0,ey=0;
      switch(i%4){
        case 0:sx=-width*.45;sy=-height*.32;ex=width*.43;ey=height*.12;break;
        case 1:sx=-width*.48;sy=height*.08;ex=width*.46;ey=-height*.08;break;
        case 2:sx=-width*.06;sy=-height*.48;ex=width*.1;ey=height*.42;break;
        default:sx=width*.43;sy=-height*.36;ex=-width*.4;ey=height*.39;
      }
      sx+=bell()*width*.06;sy+=bell()*height*.06;ex+=bell()*width*.06;ey+=bell()*height*.06;

      const frames:Float32Array[]=[],branches:Float32Array[][]=[];
      for(let frame=0;frame<7;frame++) {
        const path=makePath(sx,sy,ex,ey,unit*.055);frames.push(path);
        const twig:Float32Array[]=[];
        for(const at of (i%3===0?[16]:[])) twig.push(makePath(path[at*2],path[at*2+1],path[at*2]+range(-.09,.09)*width,path[at*2+1]+range(-.09,.09)*height,unit*.025));
        branches.push(twig);
      }
      scene.arcs.push({frames,branches,front,delay:.015+Math.floor(i/3)*.4,life:.36,thickness:range(.85,1.25)*size*proportion,phase:range(0,TAU)});
    }
    for(let i=0;i<count(12);i++)add("mote",i%4!==0,{x:bell()*width*.43,y:bell()*height*.4,vx:bell()*65,vy:bell()*65,gravity:0,drag:2,size:range(1,3)*size,delay:range(.02,.55),life:range(.12,.32)});
  }
  scene.particles.sort((a,b)=>a.z-b.z);
  // Analytic conservative travel bounds, not PNG alpha/crop bounds. No particle canvas edge cuts.
  let reach=effect==="fxImpact"?Math.max(width,height)*.55*size:120;
  for(const p of scene.particles){const age=p.life;
    const dx=Math.abs(displacement(p.vx,0,p.drag,age))+p.sway*2;
    const dy=Math.abs(displacement(p.vy,0,p.drag,age))+Math.abs(displacement(0,p.gravity,p.drag,age));
    const scale=Math.max(particleScale(p,0),particleScale(p,age));
    const radius=p.size*(p.kind==="blast"||p.kind==="smoke"?2.6:p.kind==="flame"?3.4:p.kind==="spark"?8:5)*scale;
    reach=Math.max(reach,Math.abs(p.x)+dx*scale+radius-width/2,Math.abs(p.y)+dy*scale+radius-height/2);
  }
  for(const arc of scene.arcs)for(let f=0;f<arc.frames.length;f++){
    for(let b=-1;b<arc.branches[f].length;b++){const points=b<0?arc.frames[f]:arc.branches[f][b];
      for(let j=0;j<points.length;j+=2)reach=Math.max(reach,Math.abs(points[j])-width/2+arc.thickness*8,Math.abs(points[j+1])-height/2+arc.thickness*8);
    }
  }
  scene.padding=Math.ceil(reach+32);
  return scene;
}
