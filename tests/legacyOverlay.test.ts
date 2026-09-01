import { describe, expect, it } from "vitest";
import { createLegacyPublishedSnapshot, legacyProjectToCurrent, MAX_LEGACY_SNAPSHOT_BYTES, parseLegacyProject, publicOverlayUrl, requireOwnedLegacyProject } from "@/lib/overlays/legacy";

const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
const legacy = { version: 7 as const, customFutureSetting: { keep: true }, settings: { speed: 7, theme: "themeNeon", preview: "previewClear", unknown: "preserved" }, slides: [
  { id: "gift-1", giftName: "Rose", animation: "fade", duration: 3, unknownSlide: 42, layers: [{ id: "text-1", type: "text", text: "Thank you", x: 20, y: 30, w: 40, h: 10, textShimmer: true, particle: "stars", effect: "customGradient", gradient1: "#111111", gradient2: "#eeeeee", rotation: 12 }] },
  { id: "gift-2", giftName: "Galaxy", animation: "zoom", duration: 5, layers: [{ id: "image-1", type: "image", image, fileName: "pixel.png", x: 50, y: 50, w: 25, h: 25, imgW: 30, imgH: 31, cropX: 2, cropY: 3, cropZoom: 140, opacity: 75, outline: 4, outlineColor: "#fff", imageAnimation: "orbit", particle: "sparkle" }] },
] };

describe("legacy hosted overlays", () => {
  it("converts version 7 with gift rotation and images", () => { const current=legacyProjectToCurrent(parseLegacyProject(legacy),"project-id");expect(current.slides.map(s=>s.name)).toEqual(["Rose","Galaxy"]);expect(current.settings.speed).toBe(7);expect(current.slides[1].layers[0]).toMatchObject({type:"image",imageUrl:image,cropX:2,cropY:3,cropZoom:140,opacity:75,outline:4}); });
  it("preserves the complete snapshot including unknown effects", () => { const snapshot=createLegacyPublishedSnapshot(legacy,"project-id");expect(snapshot.legacyProject).toEqual(legacy);expect(snapshot.legacyProject.slides[0]).toMatchObject({unknownSlide:42,layers:[expect.objectContaining({text:"Thank you",textShimmer:true,particle:"stars",rotation:12})]}); });
  it("creates a short URL without project or base64 data", () => { const url=publicOverlayUrl("https://overlay.example","abcdefghijklmnopqrstuvwx");expect(url).toBe("https://overlay.example/o/abcdefghijklmnopqrstuvwx");expect(url).not.toContain("data=");expect(url).not.toContain("base64");expect(url.length).toBeLessThan(100); });
  it("retains base64 images and rejects oversized snapshots explicitly", () => { expect(parseLegacyProject(legacy).slides[1]).toMatchObject({layers:[expect.objectContaining({image})]});expect(()=>parseLegacyProject({...legacy,huge:"x".repeat(MAX_LEGACY_SNAPSHOT_BYTES)})).toThrow(/too large/i); });
  it("does not replace valid text with New Text", () => { const snapshot=createLegacyPublishedSnapshot(legacy,"project-id");expect(JSON.stringify(snapshot.legacyProject)).toContain("Thank you");expect(JSON.stringify(snapshot.legacyProject)).not.toContain("New Text"); });
  it("rejects a project absent from an owner-scoped lookup", () => { expect(()=>requireOwnedLegacyProject("victim-project",null)).toThrow("Project not found");expect(()=>requireOwnedLegacyProject("mine","mine")).not.toThrow(); });
});
