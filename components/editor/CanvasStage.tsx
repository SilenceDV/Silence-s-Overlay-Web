"use client";
import {useRef,useState,type CSSProperties,type PointerEvent as RPE} from "react";
import type {EditorApi} from "@/hooks/useEditorState";
import type {EditorSettings,ImageLayer,Layer,Slide,TextLayer} from "@/types/editor";
import {StageViewport} from "./StageViewport";

const handles=["nw","n","ne","e","se","s","sw","w"] as const;
const point=(e:RPE)=>{const r=e.currentTarget.closest(".stage")!.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100,px:(e.clientX-r.left)/r.width*1920,py:(e.clientY-r.top)/r.height*1080}};
const clearSnap=()=>{const guide=document.getElementById("snapGuide");if(guide){guide.innerHTML="";guide.style.display="none"}};

function StageLayer({layer,selected,api}:{layer:Layer;selected:boolean;api:EditorApi}){
 const[editing,setEditing]=useState(false),editCheckpoint=useRef(false);
 const[start,setStart]=useState<null|{x:number;y:number;px:number;py:number;layer:Layer;handle:string;alt:boolean;pushed:boolean}>(null);
 const down=(e:RPE,handle="")=>{e.preventDefault();e.stopPropagation();api.selectLayer(layer.id);if(layer.locked)return;e.currentTarget.setPointerCapture(e.pointerId);setStart({...point(e),layer:structuredClone(layer),handle,alt:e.altKey,pushed:false})};
 const move=(e:RPE)=>{
  if(!start||!e.currentTarget.hasPointerCapture(e.pointerId))return;
  if(!start.pushed){start.pushed=true;api.checkpoint()}
  const p=point(e),dx=p.x-start.x,dy=p.y-start.y,dxp=p.px-start.px,dyp=p.py-start.py,h=start.handle,l=start.layer;
  if(!h){
   if(start.alt&&layer.type==="image")api.updateLayerLive(layer.id,{fit:"cover",cropX:(l as ImageLayer).cropX+dxp,cropY:(l as ImageLayer).cropY+dyp});
   else{
    let x=l.x+dx,y=l.y+dy;const guides:Array<["v"|"h",number]>=[];
    if(!e.shiftKey){for(const gx of [0,5,10,25,50,75,90,95,100])if(Math.abs(x-gx)<=.8){x=gx;guides.push(["v",gx]);break}for(const gy of [0,6.5,10,25,50,75,90,93.5,100])if(Math.abs(y-gy)<=.8){y=gy;guides.push(["h",gy]);break}}
    const guide=document.getElementById("snapGuide");if(guide){guide.innerHTML=guides.map(([axis,value])=>`<div class="snap${axis.toUpperCase()}" style="${axis==="v"?"left":"top"}:${value}%"></div>`).join("");guide.style.display=guides.length?"block":"none"}
    api.updateLayerLive(layer.id,{x,y});
   }
   return;
  }
  let w=l.w,hg=l.h;if(h.includes("e"))w=l.w+dx;if(h.includes("w"))w=l.w-dx;if(h.includes("s"))hg=l.h+dy;if(h.includes("n"))hg=l.h-dy;w=Math.max(1,Math.min(160,w));hg=Math.max(1,Math.min(160,hg));
  if(start.alt){const patch:Partial<Layer>={w,h:hg};if(layer.type==="image")Object.assign(patch,{fit:"cover",imageWidth:Math.max((l as ImageLayer).imageWidth,w),imageHeight:Math.max((l as ImageLayer).imageHeight,hg)});api.updateLayerLive(layer.id,patch);return}
  const patch:Partial<Layer>={w,h:hg};
  if(layer.type==="text"){const ratio=(h==="e"||h==="w")?w/l.w:(h==="n"||h==="s")?hg/l.h:Math.abs(w/l.w-1)>Math.abs(hg/l.h-1)?w/l.w:hg/l.h;Object.assign(patch,{fontSize:Math.max(8,(l as TextLayer).fontSize*ratio)})}
  else{const im=l as ImageLayer;Object.assign(patch,{imageWidth:im.imageWidth*w/l.w,imageHeight:im.imageHeight*hg/l.h,cropX:im.cropX*w/l.w,cropY:im.cropY*hg/l.h})}
  api.updateLayerLive(layer.id,patch);
 };
 const up=()=>{setStart(null);clearSnap()};
 const style={left:`${layer.x}%`,top:`${layer.y}%`,width:`${layer.w}%`,height:`${layer.h}%`,opacity:layer.opacity/100,"--textAnimSpeed":`${layer.type==="text"?layer.textAnimationSpeed:1.15}s`,"--letterDelay":`${layer.type==="text"?layer.textLetterDelay:.055}s`,"--shimmerSpeed":`${layer.type==="text"?layer.textShimmerSpeed:2.2}s`,"--burstSpeed":`${layer.type==="image"?layer.burstSpeed:.82}s`,"--layerAnimSpeed":`${layer.type==="image"?layer.imageAnimationSpeed:1.4}s`} as CSSProperties;
 return <div className={`layerBox ${selected?"selected":""} ${layer.locked?"locked":""} ${layer.type==="image"&&layer.fit==="cover"?"imageCropped":""} ${layer.type==="image"?`${layer.imageAnimation} ${layer.burstEffect}`:""}`} style={style} onPointerDown={e=>down(e)} onPointerMove={move} onPointerUp={up} onDoubleClick={e=>{e.stopPropagation();if(layer.type==="text"&&!layer.locked){editCheckpoint.current=false;setEditing(true)}}}>
  <div className="layerClip">{layer.type==="text"?<TextContent layer={layer}/>:<ImageContent layer={layer}/>}</div>
  {handles.map(h=><div key={h} className={`handle ${h}`} data-handle={h} onPointerDown={e=>down(e,h)} onPointerMove={move} onPointerUp={up}/>)}
  {editing&&layer.type==="text"&&<textarea autoFocus className="textEdit" value={layer.text} onPointerDown={e=>e.stopPropagation()} onChange={e=>{if(!editCheckpoint.current){api.checkpoint();editCheckpoint.current=true}api.updateLayerLive(layer.id,{text:e.target.value,name:e.target.value})}} onBlur={()=>setEditing(false)} onKeyDown={e=>{if(e.key==="Escape"||(e.key==="Enter"&&(e.ctrlKey||e.metaKey)))setEditing(false)}}/>}
 </div>;
}

function TextContent({layer}:{layer:TextLayer}){const animated=!['none','breatheText'].includes(layer.textAnimation);let i=0;return <div className={`layerText ${layer.effect} ${layer.textAnimation} ${layer.textShimmer?"textShimmer":""}`} style={{fontSize:layer.fontSize,WebkitTextStroke:`${layer.stroke}px black`,"--textColor":layer.color,"--gradient1":layer.gradient1,"--gradient2":layer.gradient2,"--gradientAngle":`${layer.gradientAngle}deg`} as CSSProperties}>{animated?layer.text.split("\n").map((line,n)=><span className="flowLine" key={n}>{Array.from(line).map(ch=><span className="flowChar" style={{"--i":i++} as CSSProperties} key={i}>{ch===" "?"\u00a0":ch}</span>)}</span>):layer.text}</div>}

function Particles({type,speed}:{type:string;speed:number}){if(type==="none")return null;const count=type==="lightning"?8:type==="confetti"?18:14,colors=["#ff3131","#ffbd59","#57fff4","#7ed957","#cb6ce6","#ffffff"],classes:Record<string,string>={sparkle:"particleSparkles",sparkles:"particleSparkles",stars:"particleStars",embers:"particleEmbers",confetti:"particleConfetti",lightning:"particleLightning",snow:"particleSnow"};return <div className={`particleLayer ${classes[type]??"particleSparkles"}`} style={{"--particleSpeed":`${speed}s`} as CSSProperties}>{Array.from({length:count},(_,i)=><span key={i} style={{"--px":`${8+(i*37)%86}%`,"--py":`${6+(i*53)%88}%`,"--ps":`${type==="embers"?8+(i%5)*2:12+(i%6)*3}px`,"--pd":`${(i*.17).toFixed(2)}s`,"--pdur":`${(1.5+(i%5)*.35).toFixed(2)}s`,"--pc":colors[i%colors.length]} as CSSProperties}/>)}</div>}
function ImageContent({layer}:{layer:ImageLayer}){const shadows:string[]=[];for(let d=1;d<=Math.min(10,Math.ceil(layer.outline/3));d++){const n=Math.max(1,Math.round(layer.outline*d/Math.min(10,Math.ceil(layer.outline/3))));shadows.push(`drop-shadow(${n}px 0 0 ${layer.outlineColor})`,`drop-shadow(${-n}px 0 0 ${layer.outlineColor})`,`drop-shadow(0 ${n}px 0 ${layer.outlineColor})`,`drop-shadow(0 ${-n}px 0 ${layer.outlineColor})`)}if(layer.glow)shadows.push(`drop-shadow(0 0 ${layer.glow}px ${layer.glowColor})`);return <><div className="layerMotion"><img className="layerImg" draggable={false} alt={layer.name} src={layer.imageUrl} style={{width:`${layer.imageWidth/layer.w*100}%`,height:`${layer.imageHeight/layer.h*100}%`,transform:`translate(${layer.cropX}px,${layer.cropY}px) scale(${layer.cropZoom/100})`,filter:shadows.join(" ")}}/>{layer.burstEffect!=="none"&&<div className="imageBurstFX"/>}</div><Particles type={layer.particle} speed={layer.particleSpeed}/></>}

export function CanvasStage({slide,settings,selected,api,fading=false}:{slide:Slide;settings:EditorSettings;selected:string|null;api:EditorApi;fading?:boolean}){return <main id="canvasArea" className={settings.preview}><StageViewport preview={settings.preview}><div id="overlayContent" className={settings.theme} style={{opacity:fading?0:1}}><div id="animWrap" className={slide.entranceAnimation} onPointerDown={e=>{if(e.target===e.currentTarget)api.selectLayer(null)}}>{settings.showCenter&&<div id="guideCenter"/>}{settings.showSafe&&<div id="guideSafe"/>}<div id="snapGuide"/>{slide.layers.map(l=><StageLayer key={l.id} layer={l} selected={l.id===selected} api={api}/>)}</div></div></StageViewport></main>}
