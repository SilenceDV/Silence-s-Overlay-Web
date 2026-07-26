import type { Project } from "@/types/editor"; import { HISTORY_LIMIT } from "./constants";
export const cloneProject=(p:Project):Project=>structuredClone(p);
export const pushHistory=(past:Project[],current:Project)=>[...past,cloneProject(current)].slice(-HISTORY_LIMIT);
export function undoProject(past:Project[],current:Project,future:Project[]){if(!past.length)return{past,current,future};return{past:past.slice(0,-1),current:cloneProject(past.at(-1)!),future:[cloneProject(current),...future]};}
export function redoProject(past:Project[],current:Project,future:Project[]){if(!future.length)return{past,current,future};return{past:pushHistory(past,current),current:cloneProject(future[0]),future:future.slice(1)};}
