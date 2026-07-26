import type { Point } from "./geometry"; const guides=[0,25,50,75,100];
export function snapPoint(point:Point,threshold=0.8):Point{return{x:guides.find(g=>Math.abs(g-point.x)<=threshold)??point.x,y:guides.find(g=>Math.abs(g-point.y)<=threshold)??point.y};}
