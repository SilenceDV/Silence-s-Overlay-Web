import type { LayerAnimationSettings } from "@/types/editor";
export const animationStyle=(a:LayerAnimationSettings)=>({"--animation-speed":`${Math.max(.1,a.speed)}s`,"--animation-intensity":a.intensity,"--animation-delay":`${a.delay}s`} as React.CSSProperties);
export const animationClass=(a:LayerAnimationSettings)=>a.type==="none"?"":"loop-animation anim-"+a.type;
