"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Layer, Project } from "@/types/editor";
import { StageViewport } from "@/components/editor/StageViewport";
import { ImageContent, TextContent } from "@/components/editor/CanvasStage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

  // Keep an already-open TikTok Studio/browser-source overlay synchronized with
  // editor saves. Supabase Broadcast is the fast path; periodic polling and
  // reconnect/visibility refreshes make the overlay self-healing if Realtime is
  // interrupted by TikTok Studio, sleep, or a temporary network problem.
  useEffect(()=>{
    let cancelled=false;
    let refreshing=false;

    const refresh=async()=>{
      if(cancelled||refreshing)return;
      refreshing=true;
      try{
        const response=await fetch(`/api/o/${publicId}/status`,{cache:"no-store"});
        if(!response.ok)return;
        const next=await response.json();
        if(cancelled)return;
        setActive(next.active===true);
        if(next.active===true&&next.project)setProject(next.project as Project);
      }catch{
        // Keep the last good overlay on screen during transient connectivity loss.
      }finally{
        refreshing=false;
      }
    };

    void refresh();

    const supabase=createSupabaseBrowserClient();
    const channel=supabase
      .channel(`overlay:${publicId}`)
      .on("broadcast",{event:"project-updated"},()=>{void refresh();})
      .subscribe(status=>{
        // If the WebSocket reconnects after missing an event, immediately catch up.
        if(status==="SUBSCRIBED")void refresh();
      });

    // Fallback only. Normal editor updates should arrive through Realtime almost
    // immediately after the 700ms autosave completes.
    const timer=window.setInterval(()=>{void refresh();},15000);
    const onOnline=()=>{void refresh();};
    const onVisibilityChange=()=>{if(document.visibilityState==="visible")void refresh();};
    const onPageShow=()=>{void refresh();};
    window.addEventListener("online",onOnline);
    window.addEventListener("pageshow",onPageShow);
    document.addEventListener("visibilitychange",onVisibilityChange);

    return()=>{
      cancelled=true;
      window.clearInterval(timer);
      window.removeEventListener("online",onOnline);
      window.removeEventListener("pageshow",onPageShow);
      document.removeEventListener("visibilitychange",onVisibilityChange);
      void supabase.removeChannel(channel);
    };
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
