"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import { useEffect, useRef } from "react";

export function StageViewport({ children, fullViewport = false }: { children: ReactNode; preview: string; fullViewport?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resize = () => {
      if (!viewport.current || !stage.current) return;
      const scale = Math.min(viewport.current.clientWidth / 1920, viewport.current.clientHeight / 1080);
      stage.current.style.transform = `scale(${scale})`;
      stage.current.style.left = `${(viewport.current.clientWidth - 1920 * scale) / 2}px`;
      stage.current.style.top = `${(viewport.current.clientHeight - 1080 * scale) / 2}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const viewportStyle = fullViewport ? { width: "100vw", height: "100vh", aspectRatio: "auto", borderRadius: 0, boxShadow: "none" } as CSSProperties : undefined;
  return <div id="stageViewport" ref={viewport} style={viewportStyle}><div id="stage" ref={stage} className="stage" style={{ width: 1920, height: 1080, transformOrigin: "top left" }}>{children}</div></div>;
}
