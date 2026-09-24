"use client";

import { useLayoutEffect, useRef, type ReactElement } from "react";
import type { ImageLayer } from "@/types/editor";
import { canvasResolution, createFXScene, drawFX, prepareFX } from "@/lib/editor/visualFxCanvas";
import {loadImageShape,projectImageShape,type VisibleShape} from "@/lib/editor/imageShape";
import { useFXReplay } from "./FXReplay";

export function VisualFX({ layer, preview = false }: { layer: ImageLayer; preview?: boolean }): ReactElement | null {
  const behind = useRef<HTMLCanvasElement>(null), front = useRef<HTMLCanvasElement>(null);
  const replay = useFXReplay();
  const version = useRef(0);
  if (preview && replay.id === layer.id) version.current = replay.version;
  const replayVersion = version.current;
  const {id, burstEffect, burstSpeed, fxPrimaryColor, fxSecondaryColor, fxIntensity, fxSize, fxOpacity, fxSpread, w, h, imageUrl, imageWidth, imageHeight, cropX, cropY, cropZoom} = layer;
  useLayoutEffect(() => {
    const back = behind.current, fore = front.current;
    if (!back || !fore) return;
    const backCtx = back.getContext("2d", {alpha:true}), frontCtx = fore.getContext("2d", {alpha:true});
    if (!backCtx || !frontCtx) return;
    let frame: number | null = null;
    const clear = () => {
      backCtx.setTransform(1,0,0,1,0,0); backCtx.clearRect(0,0,back.width,back.height);
      frontCtx.setTransform(1,0,0,1,0,0); frontCtx.clearRect(0,0,fore.width,fore.height);
    };
    const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; clear(); };
    clear();
    if (burstEffect === "none") {
      // Retain the DOM surfaces, but release the backing buffers while disabled.
      back.width = back.height = fore.width = fore.height = 1;
      return;
    }
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (motion?.matches || fxOpacity <= 0 || fxIntensity <= 0 || document.hidden) return;
    let disposed=false;
    const launch=(shape?:VisibleShape)=>{
    if(disposed||document.hidden||motion?.matches)return;
    const scene = createFXScene({id, burstEffect, fxPrimaryColor, fxSecondaryColor, fxIntensity, fxSize, fxOpacity, fxSpread, w, h} as ImageLayer, `${id}:0`,shape);
    // Prepare offscreen assets before touching either displayed surface.
    prepareFX(scene);
    const width = scene.width + scene.padding * 2, height = scene.height + scene.padding * 2;
    const resolution = canvasResolution(width, height, window.devicePixelRatio || 1);
    for (const canvas of [back, fore]) {
      // Assigning width/height clears and reallocates a Canvas backing store, even
      // when the value is unchanged. Colors, opacity and replay never need that.
      if (canvas.width !== resolution.width) canvas.width = resolution.width;
      if (canvas.height !== resolution.height) canvas.height = resolution.height;
      canvas.style.left=`calc(50% + ${scene.originX}px)`;canvas.style.top=`calc(50% + ${scene.originY}px)`;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    }
    // Both planes have valid transparent contents before this commit is painted.
    drawFX(backCtx, scene, 0, false); drawFX(frontCtx, scene, 0, true);
    const duration = Math.max(.2, Math.min(8, burstSpeed)) * 1000;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const time = (now - start) / duration;
      drawFX(backCtx, scene, time, false); drawFX(frontCtx, scene, time, true);
      frame = time < 1 ? requestAnimationFrame(tick) : null;
    };
    frame = requestAnimationFrame(tick);
    };
    if(imageUrl){
      void loadImageShape(imageUrl).then(source=>{
        if(disposed)return;
        if(source){const shape=projectImageShape(source,{w,h,imageWidth,imageHeight,cropX,cropY,cropZoom} as ImageLayer);if(shape)launch(shape);}
        else launch();
      });
    }else launch();
    const visibility = () => { if (document.hidden) stop(); };
    const reduced = () => { if (motion?.matches) stop(); };
    document.addEventListener("visibilitychange", visibility);
    motion?.addEventListener("change", reduced);
    return () => { disposed=true;stop(); document.removeEventListener("visibilitychange", visibility); motion?.removeEventListener("change", reduced); };
  }, [id, burstEffect, burstSpeed, fxPrimaryColor, fxSecondaryColor, fxIntensity, fxSize, fxOpacity, fxSpread, w, h, imageUrl, imageWidth, imageHeight, cropX, cropY, cropZoom, replayVersion]);
  return <><canvas ref={behind} width={1} height={1} hidden={burstEffect === "none"} aria-hidden="true" className="visualFX fxBehind"/><canvas ref={front} width={1} height={1} hidden={burstEffect === "none"} aria-hidden="true" className="visualFX fxFront"/></>;
}
