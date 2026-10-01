"use client";

import { memo, useEffect, useState, type CSSProperties } from "react";
import type { Layer, Project } from "@/types/editor";
import { StageViewport } from "@/components/editor/StageViewport";
import { ImageContent, TextContent } from "@/components/editor/CanvasStage";
import { VisualFX } from "@/components/editor/VisualFX";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HostedPerformance } from "@/lib/overlays/performance";
import { reconcileProject } from "@/lib/overlays/reconcileProject";

const HostedLayer=memo(function HostedLayer({layer,performance}:{layer:Layer;performance:HostedPerformance}){
  const style={left:`${layer.x}%`,top:`${layer.y}%`,width:`${layer.w}%`,height:`${layer.h}%`,opacity:layer.opacity/100,"--textAnimSpeed":`${layer.type==="text"?layer.textAnimationSpeed:1.15}s`,"--letterDelay":`${layer.type==="text"?layer.textLetterDelay:.055}s`,"--shimmerSpeed":`${layer.type==="text"?layer.textShimmerSpeed:2.2}s`,"--burstSpeed":`${layer.type==="image"?layer.burstSpeed:.82}s`,"--layerAnimSpeed":`${layer.type==="image"?layer.imageAnimationSpeed:1.4}s`,pointerEvents:"none"} as CSSProperties;
  return <div className={`layerBox ${layer.type==="image"&&layer.fit==="cover"?"imageCropped":""} ${layer.type==="image"?layer.imageAnimation:""}`} style={style}>
    <div className="layerClip">{layer.type==="text"?<TextContent layer={layer}/>:<ImageContent layer={layer}/>}</div>
    {layer.type==="image"&&<VisualFX layer={layer} performance={performance}/>}
  </div>;
});

export function OverlayClient({project:initialProject,publicId}:{project:Project;publicId:string}){
  const [active,setActive]=useState(true);
  const [project,setProject]=useState(initialProject);
  const [index,setIndex]=useState(0);
  const [performance]=useState(()=>new HostedPerformance());
  const slide=project.slides[Math.min(index,Math.max(0,project.slides.length-1))];
  useEffect(()=>{
    performance.setDiagnostics(new URLSearchParams(window.location.search).get("perf")==="1");
    const visible=()=>{if(!document.hidden)performance.resume();};
    document.addEventListener("visibilitychange",visible);
    return()=>{document.removeEventListener("visibilitychange",visible);performance.dispose();};
  },[performance]);
  useEffect(()=>{performance.setContent(project.slides.length,active?slide?.layers.filter(layer=>layer.opacity>0).length??0:0);},[performance,project.slides.length,slide,active]);

  useEffect(()=>{
    let cancelled=false;
    let refreshing=false;
    let pending=false;
    const controller=new AbortController();

    const refresh=async()=>{
      if(cancelled)return;
      if(refreshing){pending=true;return;}
      refreshing=true;
      try{
        const response=await fetch(`/api/o/${publicId}/status`,{cache:"no-store",signal:controller.signal});
        if(!response.ok)return;
        const next=await response.json();
        if(cancelled)return;
        setActive(next.active===true);
        if(next.active===true&&next.project)setProject(previous=>reconcileProject(previous,next.project as Project));
      }catch{
        // Keep the last good overlay on screen during transient connectivity loss.
      }finally{
        refreshing=false;
        if(pending&&!cancelled){pending=false;void refresh();}
      }
    };

    void refresh();

    const supabase=createSupabaseBrowserClient();
    const channel=supabase
      .channel(`overlay:${publicId}`)
      .on("broadcast",{event:"project-updated"},()=>{void refresh();})
      .subscribe(status=>{
        if(status==="SUBSCRIBED")void refresh();
      });

    const timer=window.setInterval(()=>{void refresh();},15000);
    const onOnline=()=>{void refresh();};
    const onVisibilityChange=()=>{if(document.visibilityState==="visible")void refresh();};
    const onPageShow=()=>{void refresh();};
    window.addEventListener("online",onOnline);
    window.addEventListener("pageshow",onPageShow);
    document.addEventListener("visibilitychange",onVisibilityChange);

    return()=>{
      cancelled=true;
      controller.abort();
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
    if(!active||project.slides.length<2)return;
    const timer=window.setInterval(()=>setIndex(i=>(i+1)%project.slides.length),Math.max(1,project.settings.speed)*1000);
    return()=>window.clearInterval(timer);
  },[active,project.slides.length,project.settings.speed]);

  if(!active||project.slides.length===0)return null;
  return <div className="overlay-only" style={{position:"fixed",inset:0,overflow:"hidden",background:"transparent"}}>
    <StageViewport preview="previewClear" fullViewport>
      <div id="overlayContent" className={project.settings.theme}>
        <div id="animWrap" key={`${slide.id}-${index}`} className={slide.entranceAnimation}>
          {slide.layers.filter(layer=>layer.opacity>0).map(layer=><HostedLayer key={layer.id} layer={layer} performance={performance}/>) }
        </div>
      </div>
    </StageViewport>
  </div>;
}
