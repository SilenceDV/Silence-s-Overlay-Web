import type {Project} from "@/types/editor";

function same(a:object,b:object){
  const keys=Object.keys(a) as (keyof typeof a)[];
  return keys.length===Object.keys(b).length&&keys.every(key=>a[key]===b[key]);
}

/** Preserve layer identity across JSON responses; no serializing embedded image data. */
export function reconcileProject(previous:Project,next:Project):Project {
  const slides=next.slides.map(slide=>{
    const old=previous.slides.find(candidate=>candidate.id===slide.id);
    if(!old)return slide;
    const layers=slide.layers.map(layer=>{
      const prior=old.layers.find(candidate=>candidate.id===layer.id);
      const candidate=prior&&same(prior.animation,layer.animation)?{...layer,animation:prior.animation}:layer;
      return prior&&same(prior,candidate)?prior:candidate;
    });
    const stable=layers.length===old.layers.length&&layers.every((layer,i)=>layer===old.layers[i]);
    const result={...slide,layers:stable?old.layers:layers};
    return same(old,result)?old:result;
  });
  const result={...next,settings:same(previous.settings,next.settings)?previous.settings:next.settings,
    slides:slides.length===previous.slides.length&&slides.every((slide,i)=>slide===previous.slides[i])?previous.slides:slides};
  return same(previous,result)?previous:result;
}
