"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Layer, Project } from "@/types/editor";
import { StageViewport } from "@/components/editor/StageViewport";
import { ImageContent, TextContent } from "@/components/editor/CanvasStage";

function HostedLayer({layer}:{layer:Layer}){
  const style={left:`${layer.x}%`,top:`${layer.y}%`,width:`${layer.w}%`,height:`${layer.h}%`,opacity:layer.opacity/100,"--textAnimSpeed":`${layer.type==="text"?layer.textAnimationSpeed:1.15}s`,"--letterDelay":`${layer.type==="text"?layer.textLetterDelay:.055}s`,"--shimmerSpeed":`${layer.type==="text"?layer.textShimmerSpeed:2.2}s`,"--burstSpeed":`${layer.type==="image"?layer.burstSpeed:.82}s`,"--layerAnimSpeed":`${layer.type==="image"?layer.imageAnimationSpeed:1.4}s`,pointerEvents:"none"} as CSSProperties;
  return <div className={`layerBox ${layer.type==="image"&&layer.fit==="cover"?"imageCropped":""} ${layer.type==="image"?`${layer.imageAnimation} ${layer.burstEffect}`:""}`} style={style}>
    <div className="layerClip">{layer.type==="text"?<TextContent layer={layer}/>:<ImageContent layer={layer}/>}</div>
  </div>;
}

export function OverlayClient({project:initialProject,publicId}:{project:Project;publicId:string}){
  const [active,setActive]=useState(true);
  const [project,setProject]=useState(initialProject);
  const [index,setIndex]=useState(0);

  // Keep an already-open browser source/test URL synchronized with editor saves.
  // Polling is intentionally lightweight and avoids requiring a realtime channel.
  useEffect(()=>{
    let cancelled=false;
    const refresh=()=>fetch(`/api/o/${publicId}/status`,{cache:"no-store"})
      .then(r=>r.json())
      .then(r=>{if(cancelled)return;setActive(r.active===true);if(r.active===true&&r.project)setProject(r.project as Project)})
      .catch(()=>{if(!cancelled)setActive(false)});
    refresh();
    const timer=window.setInterval(refresh,2000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[publicId]);

  useEffect(()=>{
    setIndex(i=>Math.min(i,Math.max(0,project.slides.length-1)));
  },[project.slides.length]);

  useEffect(()=>{
    if(project.slides.length<2)return;
    const timer=window.setInterval(()=>setIndex(i=>(i+1)%project.slides.length),Math.max(1,project.settings.speed)*1000);
    return()=>window.clearInterval(timer);
  },[project.slides.length,project.settings.speed]);

  if(!active||project.slides.length===0)return null;
  const slide=project.slides[index];
  return <div className="overlay-only" style={{position:"fixed",inset:0,overflow:"hidden",background:"transparent"}}>
    <StageViewport preview="previewClear" fullViewport>
      <div id="overlayContent" className={project.settings.theme}>
        <div id="animWrap" key={`${slide.id}-${index}`} className={slide.entranceAnimation}>
          {slide.layers.map(layer=><HostedLayer key={layer.id} layer={layer}/>) }
        </div>
      </div>
    </StageViewport>
  </div>;
}
