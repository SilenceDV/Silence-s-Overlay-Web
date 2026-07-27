import type { PointerEvent as ReactPointerEvent } from "react";
import type { EditorApi } from "@/hooks/useEditorState";
import { animationClass, animationStyle } from "@/lib/animations/layerAnimations";
import { renderTextCharacters } from "@/lib/animations/textWave";
import { clamp } from "@/lib/editor/geometry";
import type { EditorSettings, Layer, Slide } from "@/types/editor";
import { StageViewport } from "./StageViewport";

function stageDelta(event: ReactPointerEvent, previousX: number, previousY: number) {
  const stage = event.currentTarget.closest(".stage")?.getBoundingClientRect();
  if (!stage?.width || !stage.height) return { x: 0, y: 0 };
  return { x: (event.clientX - previousX) / stage.width * 100, y: (event.clientY - previousY) / stage.height * 100 };
}

function StageLayer({ layer, selected, api }: { layer: Layer; selected: boolean; api: EditorApi }) {
  const pointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (layer.locked) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.px = String(event.clientX);
    event.currentTarget.dataset.py = String(event.clientY);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    if (!element.hasPointerCapture(event.pointerId)) return;
    const px = Number(element.dataset.px);
    const py = Number(element.dataset.py);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    const delta = stageDelta(event, px, py);
    api.updateLayer(layer.id, { x: clamp(layer.x + delta.x, 0, 100), y: clamp(layer.y + delta.y, 0, 100) });
    element.dataset.px = String(event.clientX);
    element.dataset.py = String(event.clientY);
  };
  const resizeDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.px = String(event.clientX);
    event.currentTarget.dataset.py = String(event.clientY);
  };
  const resizeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const element = event.currentTarget;
    if (!element.hasPointerCapture(event.pointerId)) return;
    const px = Number(element.dataset.px);
    const py = Number(element.dataset.py);
    const delta = stageDelta(event, px, py);
    api.updateLayer(layer.id, { w: clamp(layer.w + delta.x, 1, 100), h: clamp(layer.h + delta.y, 1, 100) });
    element.dataset.px = String(event.clientX);
    element.dataset.py = String(event.clientY);
  };

  const style = { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.w}%`, height: `${layer.h}%`, opacity: layer.opacity / 100, ...animationStyle(layer.animation) };
  return <div className={`stage-layer ${selected ? "selected" : ""}`} style={style} onClick={(event) => { event.stopPropagation(); api.selectLayer(layer.id); }} onPointerDown={pointerDown} onPointerMove={pointerMove}>
    <div className={animationClass(layer.animation)}>
      {layer.type === "text"
        ? <div aria-label={layer.text} className={`text-content effect-${layer.effect}`} style={{ fontSize: layer.fontSize, color: layer.color, "--gradient-one": layer.gradient1, "--gradient-two": layer.gradient2, "--gradient-angle": `${layer.gradientAngle}deg`, WebkitTextStroke: `${layer.stroke}px #000` } as React.CSSProperties}>{renderTextCharacters(layer.text, ["wave", "bounce-wave"].includes(layer.animation.type))}</div>
        : <div className="image-clip" style={{ outline: layer.outline ? `${layer.outline}px solid ${layer.outlineColor}` : undefined }}><img draggable={false} alt={layer.name} src={layer.imageUrl} style={{ objectFit: layer.fit, transform: `translate(${layer.cropX}%,${layer.cropY}%) scale(${layer.cropZoom / 100})`, filter: `drop-shadow(0 0 ${layer.glow}px ${layer.glowColor})` }} /></div>}
    </div>
    {selected && !layer.locked && <button type="button" aria-label={`Resize ${layer.name}`} className="resize-handle" onPointerDown={resizeDown} onPointerMove={resizeMove} />}
  </div>;
}

export function CanvasStage({ slide, settings, selected, api }: { slide: Slide; settings: EditorSettings; selected: string | null; api: EditorApi }) {
  return <main className="canvas-area"><StageViewport preview={settings.preview}><div className={`slide-content entrance-${slide.entranceAnimation}`} onClick={() => api.selectLayer(null)}>{settings.showCenter && <div className="center-guides" />}{settings.showSafe && <div className="safe-guide" />}{slide.layers.map((layer) => <StageLayer key={layer.id} layer={layer} selected={layer.id === selected} api={api} />)}</div></StageViewport></main>;
}
