"use client"; import type { Layer } from "@/types/editor"; import { clamp } from "@/lib/editor/geometry";
export const resizeLayer=(l:Layer,dx:number,dy:number):Partial<Layer>=>({w:clamp(l.w+dx,1,100),h:clamp(l.h+dy,1,100)});
export const moveCrop=(l:Layer,dx:number,dy:number)=>l.type==="image"?{cropX:clamp(l.cropX+dx,-100,100),cropY:clamp(l.cropY+dy,-100,100)}:{};
