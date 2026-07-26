import { STAGE_HEIGHT,STAGE_WIDTH } from "./constants";
export interface Point{x:number;y:number} export const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
export function clientToStage(client:Point,rect:{left:number;top:number;width:number;height:number}):Point{return{x:(client.x-rect.left)/rect.width*STAGE_WIDTH,y:(client.y-rect.top)/rect.height*STAGE_HEIGHT};}
export const pixelsToPercent=(p:Point):Point=>({x:p.x/STAGE_WIDTH*100,y:p.y/STAGE_HEIGHT*100});
