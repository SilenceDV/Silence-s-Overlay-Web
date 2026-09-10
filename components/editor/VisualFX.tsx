"use client";

import { useEffect, useRef } from "react";
import type { ImageLayer } from "@/types/editor";
import { canvasResolution, createFXScene, drawFX, prepareFX } from "@/lib/editor/visualFxCanvas";
import { useFXReplay } from "./FXReplay";

export function VisualFX({ layer, preview = false }: { layer: ImageLayer; preview?: boolean }) {
  const behind = useRef<HTMLCanvasElement>(null), front = useRef<HTMLCanvasElement>(null);
  const replay = useFXReplay();
  // Keep this image's version stable when another image is replayed.
  const version = useRef(0);
  if (preview && replay.id === layer.id) version.current = replay.version;
  const replayVersion = version.current;
  const {id, burstEffect, burstSpeed, fxPrimaryColor, fxSecondaryColor, fxIntensity, fxSize, fxOpacity, fxSpread, w, h} = layer;
  useEffect(() => {
    if (burstEffect === "none" || !behind.current || !front.current) return;
    const back = behind.current, fore = front.current;
    const backCtx = back.getContext("2d"), frontCtx = fore.getContext("2d");
    if (!backCtx || !frontCtx) return;
    let frame: number | null = null;
    const clear = () => { for (const canvas of [back, fore]) { const ctx = canvas.getContext("2d"); ctx?.setTransform(1,0,0,1,0,0); ctx?.clearRect(0,0,canvas.width,canvas.height); } };
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; clear(); };
    if (motion?.matches || fxOpacity <= 0 || fxIntensity <= 0 || document.hidden) return;
    const scene = createFXScene({id, burstEffect, fxPrimaryColor, fxSecondaryColor, fxIntensity, fxSize, fxOpacity, fxSpread, w, h} as ImageLayer, `${id}:${replayVersion}`);
    const width = scene.width + scene.padding * 2, height = scene.height + scene.padding * 2;
    const resolution = canvasResolution(width, height, window.devicePixelRatio || 1);
    for (const canvas of [back, fore]) {
      canvas.width = resolution.width; canvas.height = resolution.height;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    }
    prepareFX(scene);
    const duration = Math.max(.2, Math.min(8, burstSpeed)) * 1000;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const time = (now - start) / duration;
      drawFX(backCtx, scene, time, false); drawFX(frontCtx, scene, time, true);
      frame = time < 1 ? requestAnimationFrame(tick) : null;
    };
    frame = requestAnimationFrame(tick);
    const visibility = () => { if (document.hidden) stop(); };
    const reduced = () => { if (motion?.matches) stop(); };
    document.addEventListener("visibilitychange", visibility);
    motion?.addEventListener("change", reduced);
    return () => { stop(); document.removeEventListener("visibilitychange", visibility); motion?.removeEventListener("change", reduced); };
  }, [id, burstEffect, burstSpeed, fxPrimaryColor, fxSecondaryColor, fxIntensity, fxSize, fxOpacity, fxSpread, w, h, replayVersion]);
  if (burstEffect === "none") return null;
  return <><canvas ref={behind} aria-hidden="true" className="visualFX fxBehind"/><canvas ref={front} aria-hidden="true" className="visualFX fxFront"/></>;
}
