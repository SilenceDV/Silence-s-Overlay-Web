import type { Project } from "@/types/editor"; import { normalizeProject } from "./normalization";
export const serializeProject=(p:Project)=>JSON.stringify(p,null,2);
export const serializeLegacyProject=(p:Project)=>JSON.stringify({
  name:p.name.trim()||"Silence Overlay Preset",
  version:7,
  settings:{speed:p.settings.speed,theme:p.settings.theme,preview:p.settings.preview},
  slides:p.slides.map(slide=>({id:slide.id,giftName:slide.name,animation:slide.entranceAnimation,duration:slide.duration,layers:slide.layers.map(layer=>layer.type==="image"?{...layer,image:layer.imageUrl,imgW:layer.imageWidth,imgH:layer.imageHeight}:{...layer,animation:layer.animation.type,animationSpeed:layer.animation.speed})})),
  exportedAt:new Date().toISOString(),
},null,2);
export const deserializeProject=(value:string)=>normalizeProject(JSON.parse(value) as unknown);
export const sanitizePublishedProject=(p:Project):Project=>normalizeProject(p);

