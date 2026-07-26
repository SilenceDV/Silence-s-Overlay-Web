import type { Project } from "@/types/editor"; import { normalizeProject } from "./normalization";
export const serializeProject=(p:Project)=>JSON.stringify(p,null,2);
export const deserializeProject=(value:string)=>normalizeProject(JSON.parse(value) as unknown);
export const sanitizePublishedProject=(p:Project):Project=>normalizeProject(p);
