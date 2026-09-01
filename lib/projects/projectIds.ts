import type { Project } from "@/types/editor";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_PROJECT_PREFIX = "project_";

export const createProjectId = () => crypto.randomUUID();

export function normalizeProjectId(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid project ID");
  const candidate = value.startsWith(LEGACY_PROJECT_PREFIX) ? value.slice(LEGACY_PROJECT_PREFIX.length) : value;
  if (!UUID_PATTERN.test(candidate)) throw new Error("Invalid project ID");
  return candidate.toLowerCase();
}

export function normalizeProjectIdOrNew(value: unknown): string {
  try { return normalizeProjectId(value); } catch { return createProjectId(); }
}

export function duplicateProject(source: Project): Project {
  const project = structuredClone(source);
  project.id = createProjectId();
  project.name = `${project.name} copy`;
  project.updatedAt = new Date().toISOString();
  return project;
}
