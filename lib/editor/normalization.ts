import { defaultAnimation, defaultImage, defaultProject, defaultSlide, defaultText } from "./defaults";
import type { AnimationType, EditorSettings, EntranceAnimation, Layer, Project, Slide } from "@/types/editor";

const num=(v:unknown,f:number)=>typeof v==="number"&&Number.isFinite(v)?v:f;
const str=(v:unknown,f:string)=>typeof v==="string"?v:f;
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"?v as Record<string,unknown>:{};
const oneOf=<T extends string>(v:unknown,values:readonly T[],fallback:T):T=>typeof v==="string"&&values.includes(v as T)?v as T:fallback;
const animationTypes=["none","wave","bounce-wave","pulse","glow-pulse","jitter","float","wiggle","bounce-loop","hover","shake","orbit","flip","waveLetters","bounceLetters","typewriterLetters","glitchLetters","flickerLetters","breatheText","imgPopBurst","imgImpactDrop","imgRocketIn","imgSpinSlam","imgFloatLoop","imgPulseLoop","imgWiggleLoop","imgSlowZoomIn","imgHoverBounce"] as const satisfies readonly AnimationType[];
const entranceAnimations=["none","animFade","animPop","animBounce","animSpin","animShake","animSlideUp","animFirePulse","animElectric","animZoomPunch","animGlitch","animSoftFloat"] as const satisfies readonly EntranceAnimation[];
const entranceAliases:Record<string,EntranceAnimation>={fade:"animFade",zoom:"animZoomPunch","slide-left":"animSlideUp","slide-right":"animSlideUp"};
const textAliases:Record<string,AnimationType>={textWave:"waveLetters",wave:"waveLetters",textBounce:"bounceLetters","bounce-wave":"bounceLetters",textTypewriter:"typewriterLetters",textGlitchLoop:"glitchLetters",textFlicker:"flickerLetters",textBreathing:"breatheText"};

export function normalizeLayer(input:unknown):Layer{
  const l=record(input),a=record(l.animation);
  const rawAnimation=str(a.type??l.textAnimation??l.imageAnimation,"none");
  const mapped=(textAliases[rawAnimation]??rawAnimation) as AnimationType;
  const animation={...defaultAnimation(),...a,type:oneOf(mapped,animationTypes,"none"),speed:num(a.speed,num(l.textAnimationSpeed??l.imageAnimationSpeed,1)),intensity:num(a.intensity,1),delay:num(a.delay,num(l.textLetterDelay,0))};
  const common={...l,id:str(l.id,crypto.randomUUID()),name:str(l.name,"Layer"),x:num(l.x,50),y:num(l.y,50),w:Math.max(1,num(l.w,28)),h:Math.max(1,num(l.h,28)),opacity:num(l.opacity,100),locked:Boolean(l.locked),animation};
  if(l.type==="image"){
    const d=defaultImage(str(l.imageUrl??l.image,""),str(l.fileName,"Image"));
    const imageAnimation=oneOf(textAliases[str(l.imageAnimation??a.type,"none")]??str(l.imageAnimation??a.type,"none"),animationTypes,"none");
    return {...d,...common,type:"image",imageUrl:str(l.imageUrl??l.image,""),fileName:str(l.fileName,""),fit:l.fit==="cover"?"cover":"contain",cropX:num(l.cropX,0),cropY:num(l.cropY,0),cropZoom:num(l.cropZoom,100),imageWidth:num(l.imageWidth??l.imgW??l.innerW,common.w),imageHeight:num(l.imageHeight??l.imgH??l.innerH,common.h),outline:num(l.outline,0),outlineColor:str(l.outlineColor,"#ffffff"),glow:num(l.glow,0),glowColor:str(l.glowColor,"#00aaff"),imageAnimation,imageAnimationSpeed:num(l.imageAnimationSpeed,1.4),burstEffect:oneOf(l.burstEffect,["none","burstImpact","burstRing","burstStar","burstComet","burstShockwave","burstLoop"] as const,"none"),burstSpeed:num(l.burstSpeed,.82),particle:str(l.particle,"none"),particleSpeed:num(l.particleSpeed,2.4)};
  }
  const d=defaultText();
  const rawEffect=str(l.effect,"solid");
  const effect=oneOf(rawEffect,["solid","gradient","customGradient","rainbow","aurora","fireText","iceText","goldText"] as const,"solid");
  const textAnimation=oneOf(textAliases[str(l.textAnimation??a.type,"none")]??str(l.textAnimation??a.type,"none"),animationTypes,"none");
  return {...d,...common,type:"text",text:str(l.text,"New Text"),fontSize:num(l.fontSize,72),effect,color:str(l.color,"#57fff4"),gradient1:str(l.gradient1,"#00aaff"),gradient2:str(l.gradient2,"#ff7a00"),gradientAngle:num(l.gradientAngle,90),stroke:num(l.stroke,3),textAnimation,textAnimationSpeed:num(l.textAnimationSpeed,1.15),textLetterDelay:num(l.textLetterDelay,.055),textShimmer:Boolean(l.textShimmer),textShimmerSpeed:num(l.textShimmerSpeed,2.2),boxEnabled:Boolean(l.boxEnabled),boxColor:str(l.boxColor,"#000000"),boxOpacity:num(l.boxOpacity,55),boxRadius:num(l.boxRadius,18),boxPad:num(l.boxPad,10)};
}

export function normalizeSlide(input:unknown):Slide{
  const s=record(input),d=defaultSlide();
  let layers=Array.isArray(s.layers)?s.layers.map(normalizeLayer):[];
  if(!Array.isArray(s.layers)){
    if(typeof s.image==="undefined") layers=[defaultText(str(s.text,"New Text"),num(s.textX,50),num(s.textY,82))];
    else layers=[defaultImage(str(s.image,""),str(s.fileName,"")),defaultText(str(s.text,"New Text"),num(s.textX,50),num(s.textY,82))];
    if(layers[0]?.type==="image"){layers[0].x=num(s.imageX,50);layers[0].y=num(s.imageY,45);}
  }
  const raw=str(s.entranceAnimation??s.animation,"none");
  return {...s,...d,id:str(s.id,d.id),name:str(s.name??s.giftName,"New Gift"),entranceAnimation:oneOf(entranceAliases[raw]??raw,entranceAnimations,"none"),duration:num(s.duration,0),layers:layers.length?layers:[defaultText()]};
}

export function normalizeProject(input:unknown):Project{
  const p=record(input),d=defaultProject(),slides=Array.isArray(p.slides)?p.slides.map(normalizeSlide):d.slides,settings=record(p.settings);
  const themeAliases:Record<string,EditorSettings["theme"]>={none:"themeNone",neon:"themeNeonGreenPurple",glass:"themeGlowBlueOrange"};
  const previewAliases:Record<string,EditorSettings["preview"]>={checker:"previewChecker",clear:"previewClear",black:"previewBlack",green:"previewGreen"};
  const normalizedSettings:EditorSettings={speed:Math.max(1,num(settings.speed,d.settings.speed)),theme:oneOf(themeAliases[str(settings.theme,"")]??settings.theme,["themeNone","themeGlowBlueOrange","themeNeonGreenPurple","themeGoldVIP","themeFire","themeIce"] as const,d.settings.theme),preview:oneOf(previewAliases[str(settings.preview,"")]??settings.preview,["previewChecker","previewClear","previewBlack","previewGreen"] as const,d.settings.preview),showCenter:typeof settings.showCenter==="boolean"?settings.showCenter:d.settings.showCenter,showSafe:typeof settings.showSafe==="boolean"?settings.showSafe:d.settings.showSafe};
  return {...p,...d,id:str(p.id,d.id),name:str(p.name,"Untitled Overlay"),slides:slides.length?slides:d.slides,settings:normalizedSettings,schemaVersion:2,updatedAt:str(p.updatedAt,new Date().toISOString())};
}
