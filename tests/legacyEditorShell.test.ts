import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const legacy = readFileSync(join(process.cwd(), "archive", "Overlay4-legacy.html"), "utf8");
const editorPage = readFileSync(join(process.cwd(), "app", "editor", "page.tsx"), "utf8");

describe("authoritative legacy editor shell", () => {
  it("renders the archived legacy document instead of the approximate React editor", () => {
    expect(editorPage).toContain('src={`/legacy-overlay?editorProjectId=');
    expect(editorPage).not.toContain("<OverlayEditor");
    expect(legacy).toContain('id="leftPanel"');
    expect(legacy).toContain('id="topToolbar"');
    expect(legacy).toContain('id="stageViewport"');
  });

  it("keeps cloud persistence and owner-scoped API routes around the legacy UI", () => {
    expect(legacy).toContain('cloudRequest("/api/projects/"+encodeURIComponent(cloudProjectId)');
    expect(legacy).toContain('method:"PUT"');
    expect(legacy).toContain('method:"DELETE"');
  });

  it("publishes a short hosted URL while retaining compressed fallback links", () => {
    expect(legacy).toContain('cloudRequest("/api/overlays/publish"');
    expect(legacy).toContain("new URL(published.url,location.origin).href");
    expect(legacy).toContain('?mode=overlay#compressed="+encoded');
  });
});
