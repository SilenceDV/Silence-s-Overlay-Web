"use client";

import type { CSSProperties } from "react";
import type { ImageLayer } from "@/types/editor";

const frontEffects = new Set<ImageLayer["burstEffect"]>([
  "fxSparkles",
  "fxConfetti",
  "fxHearts",
  "fxElectric",
  "fxPixelBurst",
  "fxGlitch",
  "fxFireBurst",
  "fxIceShatter",
]);

const counts: Partial<Record<ImageLayer["burstEffect"], number>> = {
  fxShockwave: 3,
  fxSparkles: 18,
  fxConfetti: 24,
  fxHearts: 14,
  fxElectric: 10,
  fxPixelBurst: 20,
  fxSmoke: 14,
  fxEnergyRing: 4,
  fxGlitch: 16,
  fxFireBurst: 18,
  fxIceShatter: 18,
};

function pieceStyle(index: number, count: number): CSSProperties {
  const degrees = (index / Math.max(1, count)) * 360 + (index % 4) * 11;
  const radians = degrees * Math.PI / 180;
  const orbit = 28 + (index % 5) * 7;
  const distance = 82 + (index % 6) * 26;
  return {
    "--fxAngle": `${degrees}deg`,
    "--fxDistance": `${distance}px`,
    "--fxDelay": `${((index % 7) * .045).toFixed(3)}s`,
    "--fxPieceSize": `${8 + (index % 6) * 4}px`,
    "--fxX": `${50 + Math.cos(radians) * orbit}%`,
    "--fxY": `${50 + Math.sin(radians) * orbit}%`,
    "--fxRotation": `${(index * 47) % 360}deg`,
  } as CSSProperties;
}

export function VisualFX({ layer }: { layer: ImageLayer }) {
  if (layer.burstEffect === "none") return null;

  const intensity = Math.max(.1, Math.min(1.5, layer.fxIntensity / 100));
  const size = Math.max(.5, Math.min(2, layer.fxSize / 100));
  const opacity = Math.max(0, Math.min(1, layer.fxOpacity / 100));
  const count = counts[layer.burstEffect] ?? 0;
  const signature = [
    layer.burstEffect,
    layer.burstSpeed,
    layer.fxPrimaryColor,
    layer.fxSecondaryColor,
    layer.fxIntensity,
    layer.fxSize,
    layer.fxOpacity,
  ].join(":");
  const style = {
    "--fxSpeed": `${Math.max(.2, layer.burstSpeed)}s`,
    "--fxPrimary": layer.fxPrimaryColor || "#ffffff",
    "--fxSecondary": layer.fxSecondaryColor || "#ff2d55",
    "--fxIntensity": String(intensity),
    "--fxScale": String(size),
    "--fxOpacity": String(opacity),
  } as CSSProperties;

  return <div
    key={signature}
    aria-hidden="true"
    className={`visualFX ${layer.burstEffect} ${frontEffects.has(layer.burstEffect) ? "fxFront" : "fxBehind"}`}
    style={style}
  >
    {Array.from({ length: count }, (_, index) => <span key={index} style={pieceStyle(index, count)} />)}
  </div>;
}
