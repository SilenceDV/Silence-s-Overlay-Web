import { normalizeProject } from "@/lib/editor/normalization";
import type { Project } from "@/types/editor";
import { normalizeProjectIdOrNew } from "@/lib/projects/projectIds";

export const MAX_LEGACY_SNAPSHOT_BYTES = 3_500_000;

export type LegacyRecord = Record<string, unknown>;
export interface LegacyProjectV7 extends LegacyRecord {
  version: 7;
  settings: LegacyRecord;
  slides: LegacyRecord[];
}
export interface LegacyPublishedSnapshot {
  format: "legacy-v7";
  legacyProject: LegacyProjectV7;
  project: Project;
}

const record = (value: unknown): LegacyRecord => value && typeof value === "object" && !Array.isArray(value) ? value as LegacyRecord : {};

export function parseLegacyProject(value: unknown): LegacyProjectV7 {
  const input = record(value);
  if (input.version !== 7 || !Array.isArray(input.slides) || !input.slides.length) throw new Error("A version-7 legacy project with at least one slide is required");
  const snapshot = structuredClone(input) as LegacyProjectV7;
  snapshot.settings = record(snapshot.settings);
  snapshot.slides = snapshot.slides.map(record);
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
  if (bytes > MAX_LEGACY_SNAPSHOT_BYTES) throw Object.assign(new Error("Legacy overlay is too large to publish safely. Compress images until the project is under 3.5 MB."), { code: "SNAPSHOT_TOO_LARGE" });
  return snapshot;
}

export function legacyProjectToCurrent(legacy: LegacyProjectV7, id = crypto.randomUUID()): Project {
  return normalizeProject({
    id: normalizeProjectIdOrNew(id),
    name: typeof legacy.name === "string" ? legacy.name : "Legacy Overlay",
    slides: legacy.slides.map(slide => ({ ...slide, name: slide.giftName, entranceAnimation: slide.animation })),
    settings: {
      ...legacy.settings,
      theme: legacy.settings.theme === "themeNeon" ? "neon" : legacy.settings.theme === "themeGlass" ? "glass" : "none",
      preview: "clear",
    },
  });
}

export function createLegacyPublishedSnapshot(value: unknown, id?: string): LegacyPublishedSnapshot {
  const legacyProject = parseLegacyProject(value);
  return { format: "legacy-v7", legacyProject, project: legacyProjectToCurrent(legacyProject, id) };
}

export function requireOwnedLegacyProject(projectId: string | undefined, ownedProjectId: string | null | undefined) {
  if (projectId && ownedProjectId !== projectId) throw new Error("Project not found");
}

export const isLegacyPublishedSnapshot = (value: unknown): value is LegacyPublishedSnapshot => record(value).format === "legacy-v7" && record(record(value).legacyProject).version === 7;
export const publicOverlayUrl = (origin: string, publicId: string) => new URL(`/o/${publicId}`, origin).href;
