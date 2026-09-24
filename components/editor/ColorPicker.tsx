"use client";
import {useEffect,useId,useRef,useState} from "react";

const basics=["#ffffff","#f2f2f2","#d9d9d9","#999999","#666666","#333333","#000000","#ff3131","#ff5757","#ff914d","#ffbd59","#ffde59","#c9e265","#7ed957","#00bf63","#00c2a8","#57fff4","#38b6ff","#0097b2","#5271ff","#004aad","#8c52ff","#cb6ce6","#ff66c4","#ff0099","#a64d79","#7a3e00","#b87333"];
const streamer=["#00aaff","#ff7a00","#57fff4","#ffffff","#111111","#20b15a","#ffd700","#006eff","#ff3300","#00ff99","#b56cff","#ff8cff","#ffcc42","#ff0000"];
const COLOR_PICKER_OPEN_EVENT="silence-color-picker-open";

export function ColorPicker({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 const[open,setOpen]=useState(false);
 const id=useId();
 const wrap=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  const closeOther=(event:Event)=>{
   const custom=event as CustomEvent<string>;
   if(custom.detail!==id)setOpen(false);
  };
  const outside=(event:PointerEvent)=>{
   if(open&&wrap.current&&!wrap.current.contains(event.target as Node))setOpen(false);
  };
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==="Escape")setOpen(false);
  };
  window.addEventListener(COLOR_PICKER_OPEN_EVENT,closeOther as EventListener);
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",keydown);
  return()=>{
   window.removeEventListener(COLOR_PICKER_OPEN_EVENT,closeOther as EventListener);
   document.removeEventListener("pointerdown",outside);
   document.removeEventListener("keydown",keydown);
  };
 },[id,open]);

 const toggle=()=>{
  if(open){setOpen(false);return;}
  window.dispatchEvent(new CustomEvent<string>(COLOR_PICKER_OPEN_EVENT,{detail:id}));
  setOpen(true);
 };

 return <><label>{label}</label><div ref={wrap} className={`colorDropdownWrap ${open?"open":""}`}><button type="button" className="colorDropdownBtn" aria-expanded={open} onClick={toggle}><span className="colorChoice"><i className="colorDropdownPreview" style={{background:value}}/>Choose color</span><span>▼</span></button><div className="colorDropdownPanel"><div className="colorPanel"><p className="colorPanelTitle">Default colors</p><div className="colorGrid">{basics.map(c=><button key={c} type="button" className="colorSwatch" title={c} style={{background:c}} onClick={()=>{onChange(c);setOpen(false)}}/>)}</div><p className="colorPanelTitle">Stream colors</p><div className="colorGrid">{streamer.map(c=><button key={c} type="button" className="colorSwatch" title={c} style={{background:c}} onClick={()=>{onChange(c);setOpen(false)}}/>)}</div><div className="customColorRow"><span>Custom / slider picker</span><input type="color" value={value} onChange={e=>onChange(e.target.value)}/></div></div></div></div></>;
}
