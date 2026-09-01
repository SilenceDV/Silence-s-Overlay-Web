export type AnimationType = "none" | "wave" | "bounce-wave" | "pulse" | "glow-pulse" | "jitter" | "float" | "wiggle" | "bounce-loop" | "hover" | "shake" | "orbit" | "flip";
export interface LayerAnimationSettings { type: AnimationType; speed: number; intensity: number; delay: number }
export interface LayerBase { id:string; name:string; x:number; y:number; w:number; h:number; opacity:number; locked:boolean; animation:LayerAnimationSettings }
export interface TextLayer extends LayerBase { type:"text"; text:string; fontSize:number; effect:"solid"|"gradient"; color:string; gradient1:string; gradient2:string; gradientAngle:number; stroke:number }
export interface ImageLayer extends LayerBase { type:"image"; imageUrl:string; fileName:string; fit:"contain"|"cover"; cropX:number; cropY:number; cropZoom:number; imageWidth:number; imageHeight:number; outline:number; outlineColor:string; glow:number; glowColor:string }
export type Layer = TextLayer | ImageLayer;
export interface Slide { id:string; name:string; entranceAnimation:"none"|"fade"|"slide-left"|"slide-right"|"zoom"; duration:number; layers:Layer[] }
export interface EditorSettings { speed:number; theme:"none"|"neon"|"glass"; preview:"checker"|"clear"|"black"|"green"; showCenter:boolean; showSafe:boolean }
export interface Project { id:string; name:string; schemaVersion:2; slides:Slide[]; settings:EditorSettings; updatedAt:string }
export interface EditorState { project:Project; currentSlideId:string; selectedLayerId:string|null; past:Project[]; future:Project[]; saveStatus:"saved"|"saving"|"dirty"|"error" }
export interface PublishedOverlay { publicId:string; ownerId:string; projectId:string; enabled:boolean; snapshot:Project; publishedAt:string }
