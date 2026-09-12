"use client";

import React, {useLayoutEffect,useMemo,useRef,type CSSProperties} from "react";
import type {TextLayer} from "@/types/editor";
import {measureTextGlyphs,splitTextGlyphs} from "@/lib/editor/textLayout";

const letterAnimations=new Set(["waveLetters","bounceLetters","typewriterLetters","glitchLetters","flickerLetters"]);
function textStyle(layer:TextLayer):CSSProperties {
  return {fontSize:layer.fontSize,"--textColor":layer.color,"--textStroke":`${layer.stroke}px`,
    "--gradient1":layer.gradient1,"--gradient2":layer.gradient2,"--gradientAngle":`${layer.gradientAngle}deg`,
    "--textAnimSpeed":`${layer.textAnimationSpeed}s`,"--letterDelay":`${layer.textLetterDelay}s`,"--shimmerSpeed":`${layer.textShimmerSpeed}s`
  } as CSSProperties;
}

/** This path deliberately has no glyph hooks, spans, or layout measurements. */
function StaticText({layer}:{layer:TextLayer}) {
  return <div className={`layerText textStatic ${layer.effect} ${layer.textAnimation}${layer.textShimmer?" staticShimmer":""}`}
    style={textStyle(layer)} data-text={layer.textShimmer?layer.text:undefined}>{layer.text}</div>;
}

function AnimatedText({layer}:{layer:TextLayer}) {
  const root=useRef<HTMLDivElement>(null),reference=useRef<HTMLSpanElement>(null);
  const glyphs=useMemo(()=>splitTextGlyphs(layer.text),[layer.text]);
  useLayoutEffect(()=>{
    const element=root.current,source=reference.current;if(!element||!source)return;
    let disposed=false;
    const measure=()=>{
      if(disposed)return;
      const positions=measureTextGlyphs(source,glyphs);
      const chars=element.querySelectorAll<HTMLElement>(".flowChar");
      positions.forEach((p,i)=>{
        const char=chars[i];if(!char)return;
        char.style.left=`${p.x}px`;char.style.top=`${p.y}px`;
        char.style.width=`${p.width}px`;char.style.height=`${p.height}px`;
        char.style.setProperty("--glyph-x",`${p.fieldX}px`);
        char.style.setProperty("--glyph-y","0px");
        char.style.setProperty("--line-width",`${p.fieldWidth}px`);
        char.style.setProperty("--line-height",`${p.height}px`);
      });
      element.setAttribute("data-measured","");
    };
    measure();
    const resize=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
    resize?.observe(source);
    const fonts=document.fonts;
    void fonts?.ready.then(measure);
    fonts?.addEventListener("loadingdone",measure);
    return()=>{disposed=true;resize?.disconnect();fonts?.removeEventListener("loadingdone",measure);};
  },[glyphs,layer.fontSize]);
  return <div ref={root} className={`layerText animatedText ${layer.textAnimation}`} aria-label={layer.text} style={textStyle(layer)}>
    {/* The continuous string reserves exactly the static layout, but never paints. */}
    <span ref={reference} className="textMeasure" aria-hidden="true">{layer.text}</span>
    {glyphs.map((glyph,i)=><span className="flowChar" aria-hidden="true" style={{"--i":i} as CSSProperties} key={glyph.start}>
      <span className={`textGlyph ${layer.effect}${layer.textShimmer?" glyphShimmer":""}`} data-glyph={glyph.text}>{glyph.text}</span>
    </span>)}
  </div>;
}

/** Shared editor/hosted entry point. Changing paths unmounts all motion state. */
export function TextContent({layer}:{layer:TextLayer}) {
  const boxStyle=layer.boxEnabled?{backgroundColor:`color-mix(in srgb, ${layer.boxColor} ${layer.boxOpacity}%, transparent)`,borderRadius:layer.boxRadius,padding:layer.boxPad}:undefined;
  return <div style={boxStyle}>{letterAnimations.has(layer.textAnimation)?<AnimatedText key="letters" layer={layer}/>:<StaticText key="static" layer={layer}/>}</div>;
}
