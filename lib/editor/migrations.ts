import type { Project } from "@/types/editor"; import { normalizeProject } from "./normalization";
export function migrateLegacyProject(input:unknown):Project { return normalizeProject(input); }
