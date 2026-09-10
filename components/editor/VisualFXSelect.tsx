"use client";

import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import {fxOptions} from "@/lib/editor/visualFx";
import type {VisualEffectType} from "@/types/editor";

const options:ReadonlyArray<readonly [VisualEffectType,string]>=[
  ["none","None"],...fxOptions,
  ["fxComicImpact","Impact (Legacy)"],["fxShockwave","Shockwave"],
  ["fxSparkles","Sparkles (Legacy)"],["fxHearts","Hearts (Legacy)"],
  ["fxPixelBurst","Pixel Burst (Legacy)"],["fxEnergyRing","Energy Ring (Legacy)"],["fxGlitch","Glitch (Legacy)"],
];

/** Only the FX selector uses this DOM listbox; no native select popup is painted. */
export function VisualFXSelect({value,onChange}:{value:VisualEffectType;onChange:(value:VisualEffectType)=>void}) {
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
  const selected=Math.max(0,options.findIndex(([key])=>key===value));
  const [open,setOpen]=useState(false),[active,setActive]=useState(selected);
  const [position,setPosition]=useState({left:0,top:0,width:0,maxHeight:320});
  const search=useRef({text:"",time:0});
  const show=(index=selected)=>{
    const rect=trigger.current!.getBoundingClientRect(),below=window.innerHeight-rect.bottom-8,above=rect.top-8;
    const upward=below<240&&above>below,maxHeight=Math.max(48,Math.min(320,upward?above:below));
    const width=Math.min(rect.width,window.innerWidth-16);
    setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),top:upward?rect.top-maxHeight-4:rect.bottom+4,width,maxHeight});
    setActive(index);setOpen(true);
  };
  const choose=(index:number)=>{onChange(options[index][0]);setOpen(false);trigger.current?.focus()};
  useEffect(()=>{
    if(!open)return;
    const outside=(event:Event)=>{
      const target=event.target as Node;
      if(!trigger.current?.contains(target)&&!menu.current?.contains(target))setOpen(false);
    };
    const scroll=(event:Event)=>{if(!(event.target instanceof Node)||!menu.current?.contains(event.target))setOpen(false)};
    const resize=()=>setOpen(false);
    document.addEventListener("pointerdown",outside);document.addEventListener("focusin",outside);
    window.addEventListener("scroll",scroll,true);window.addEventListener("resize",resize);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("focusin",outside);window.removeEventListener("scroll",scroll,true);window.removeEventListener("resize",resize)};
  },[open]);
  useLayoutEffect(()=>{if(open)menu.current?.children[active]?.scrollIntoView?.({block:"nearest"})},[open,active]);
  const keyDown=(event:KeyboardEvent<HTMLButtonElement>)=>{
    const key=event.key;
    if(key==="Escape"){if(open){event.preventDefault();event.stopPropagation();setOpen(false)}return}
    if(key==="Tab"){setOpen(false);return}
    if(key==="Enter"||key===" "){event.preventDefault();if(open)choose(active);else show();return}
    if(["ArrowDown","ArrowUp","Home","End"].includes(key)){
      event.preventDefault();
      const next=key==="Home"?0:key==="End"?options.length-1:open?(active+(key==="ArrowDown"?1:-1)+options.length)%options.length:selected;
      if(open)setActive(next);else show(next);return;
    }
    if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      event.preventDefault();const now=Date.now();
      const prefix=now-search.current.time>700?key:search.current.text+key;search.current={text:prefix.toLowerCase(),time:now};
      const repeated=[...prefix.toLowerCase()].every(c=>c===prefix[0].toLowerCase());
      const query=repeated?key.toLowerCase():prefix.toLowerCase(),start=repeated?(open?active:selected)+1:0;
      for(let offset=0;offset<options.length;offset++){const index=(start+offset)%options.length;if(options[index][1].toLowerCase().startsWith(query)){if(open)setActive(index);else show(index);break}}
    }
  };
  return <><label id={`${id}-label`} htmlFor={id}>Visual FX</label>
    <button ref={trigger} id={id} type="button" role="combobox" className="visual-fx-select"
      aria-labelledby={`${id}-label`} aria-haspopup="listbox" aria-expanded={open}
      aria-controls={open?`${id}-menu`:undefined} aria-activedescendant={open?`${id}-option-${active}`:undefined}
      onClick={()=>open?setOpen(false):show()} onKeyDown={keyDown}>
      <span>{options[selected][1]}</span><svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
    </button>
    {open&&createPortal(<div ref={menu} id={`${id}-menu`} role="listbox" aria-labelledby={`${id}-label`}
      className="visual-fx-menu" style={{...position,position:"fixed",backgroundColor:"#24242d",color:"#fff",colorScheme:"dark",zIndex:30001}}
      onMouseDown={event=>event.preventDefault()}>
      {options.map(([key,label],index)=><div key={key} id={`${id}-option-${index}`} role="option" aria-selected={key===value}
        className={`visual-fx-option${index===active?" is-active":""}`} onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}>
        <span>{label}</span><span aria-hidden="true">{key===value&&<svg width="12" height="12" viewBox="0 0 12 12"><path d="m1 6 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}</span>
      </div>)}
    </div>,document.body)}
  </>;
}
