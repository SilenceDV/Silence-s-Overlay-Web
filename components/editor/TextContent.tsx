"use client";

import React, {useLayoutEffect,useRef,type CSSProperties} from "react";
import type {TextLayer} from "@/types/editor";

const segmenter=typeof Intl.Segmenter==="function"?new Intl.Segmenter(undefined,{granularity:"grapheme"}):null;
const glyphs=(text:string)=>segmenter?Array.from(segmenter.segment(text),item=>item.segment):Array.from(text);

/** Movement owns the outer span; fill, stroke and clipped light own its glyph.
 * Both editor and hosted output use this component, including static text. */
export function TextContent({layer}:{layer:TextLayer}) {
  const root=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const element=root.current;if(!element)return;
    let disposed=false;
    const measure=()=>{
      if(disposed)return;
      // offset geometry is in untransformed layout pixels: wave, breathing and
      // StageViewport zoom must never alter a letter's section of the field.
      const measurements=Array.from(element.querySelectorAll<HTMLElement>(".flowLine")).map(line=>({
        line,width:line.offsetWidth,height:line.offsetHeight,
        chars:Array.from(line.querySelectorAll<HTMLElement>(".flowChar")).map(char=>({char,x:char.offsetLeft,y:char.offsetTop,width:char.offsetWidth,height:char.offsetHeight}))
      }));
      for(const {line,width,height,chars} of measurements){
        line.style.setProperty("--line-width",`${Math.max(1,width)}px`);
        line.style.setProperty("--line-height",`${Math.max(1,height)}px`);
        const rows=new Map<number,{left:number;right:number;height:number}>();
        for(const p of chars){const row=rows.get(p.y);rows.set(p.y,{left:Math.min(row?.left??p.x,p.x),right:Math.max(row?.right??0,p.x+p.width),height:Math.max(row?.height??0,p.height)});}
        for(const {char,x,y} of chars){
          const row=rows.get(y)!;
          char.style.setProperty("--glyph-x",`${x-row.left}px`);
          char.style.setProperty("--glyph-y","0px");
          char.style.setProperty("--line-width",`${Math.max(1,row.right-row.left)}px`);
          char.style.setProperty("--line-height",`${Math.max(1,row.height)}px`);
        }
      }
    };
    measure();
    const resize=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
    resize?.observe(element);
    element.querySelectorAll(".flowLine").forEach(line=>resize?.observe(line));
    const fonts=document.fonts;
    void fonts?.ready.then(measure);
    fonts?.addEventListener("loadingdone",measure);
    return()=>{disposed=true;resize?.disconnect();fonts?.removeEventListener("loadingdone",measure);};
  },[layer.text,layer.fontSize,layer.textAnimation]);
  let index=0;
  const boxStyle=layer.boxEnabled?{backgroundColor:`color-mix(in srgb, ${layer.boxColor} ${layer.boxOpacity}%, transparent)`,borderRadius:layer.boxRadius,padding:layer.boxPad}:undefined;
  return <div style={boxStyle}><div ref={root} className={`layerText ${layer.textAnimation}${["none","breatheText"].includes(layer.textAnimation)?" textStatic":""}`} aria-label={layer.text} style={{
    fontSize:layer.fontSize,"--textColor":layer.color,"--textStroke":`${layer.stroke}px`,
    "--gradient1":layer.gradient1,"--gradient2":layer.gradient2,"--gradientAngle":`${layer.gradientAngle}deg`,
    "--textAnimSpeed":`${layer.textAnimationSpeed}s`,"--letterDelay":`${layer.textLetterDelay}s`,"--shimmerSpeed":`${layer.textShimmerSpeed}s`
  } as CSSProperties}>
    {layer.text.split("\n").map((line,n)=>{
      // A coordinated estimate also paints safely before client hydration/font
      // loading; layout replaces it with actual widths before normal playback.
      const advance=layer.fontSize*2,estimatedWidth=Math.max(1,glyphs(line).length*advance);
      let column=0;
      return <span className="flowLine" key={`${n}:${line}`} aria-hidden="true">
      {line?line.match(/\S+|\s+/gu)!.map((word,w)=><span className="flowWord" key={w}>{glyphs(word).map((glyph,j)=><span className="flowChar" style={{"--i":index++,"--glyph-x":`${column++*advance}px`,"--glyph-y":"0px","--line-width":`${estimatedWidth}px`,"--line-height":`${layer.fontSize}px`} as CSSProperties} key={j}>
        <span className={`textGlyph ${layer.effect}${layer.textShimmer?" glyphShimmer":""}`} data-glyph={glyph}>{glyph}</span>
      </span>)}</span>):<br/>}
    </span>})}
  </div></div>;
}
