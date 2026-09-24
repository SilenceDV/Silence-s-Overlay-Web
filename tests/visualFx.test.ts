import { describe, expect, it } from "vitest";
import { normalizeProject } from "@/lib/editor/normalization";
import { defaultImage } from "@/lib/editor/defaults";
import { deserializeProject, serializeLegacyProject } from "@/lib/editor/serialization";
import { projectSchema } from "@/lib/validation/projectSchemas";
import { legacyFxAliases, visualEffects, fxOptions } from "@/lib/editor/visualFx";
import { canvasResolution, createFXScene, MAX_FX_PIXELS } from "@/lib/editor/visualFxCanvas";

const projectWith = (settings: Record<string, unknown>) => normalizeProject({slides:[{layers:[{type:"image", image:"data:image/png;base64,AA", ...settings}]}]});
describe("Visual FX compatibility", () => {
  it.each(Object.entries(legacyFxAliases))("migrates %s and validates the project", (burstEffect, expected) => {
    const project = projectWith({burstEffect});
    expect(project.slides[0].layers[0].burstEffect).toBe(expected);
    expect(projectSchema.safeParse(project).success).toBe(true);
    // API consumers that validate already-shaped legacy projects also remain compatible.
    project.slides[0].layers[0].burstEffect = burstEffect;
    expect(projectSchema.safeParse(project).success).toBe(true);
  });
  it.each(visualEffects)("round-trips %s through legacy JSON exports", burstEffect => {
    const project = projectWith({burstEffect, fxSpread:145, fxPrimaryColor:"#123456", fxSecondaryColor:"#abcdef"});
    const restored = deserializeProject(serializeLegacyProject(project));
    expect(restored.slides[0].layers[0]).toMatchObject({burstEffect, fxSpread:145, fxPrimaryColor:"#123456", fxSecondaryColor:"#abcdef"});
    expect(projectSchema.safeParse(restored).success).toBe(true);
  });
  it("defaults missing settings on old imports", () => {
    const project = projectWith({burstEffect:"burstRing"});
    expect(project.slides[0].layers[0]).toMatchObject({fxSpread:100, fxIntensity:70, fxSize:100, fxOpacity:100});
    expect(projectSchema.safeParse(project).success).toBe(true);
  });
  it.each(["unknown", null, 42, {}, "__proto__"])("safely normalizes invalid effect %j", burstEffect => {
    const project = projectWith({burstEffect, fxSpread:NaN, burstSpeed:Infinity});
    expect(project.slides[0].layers[0].burstEffect).toBe("none");
    expect(projectSchema.safeParse(project).success).toBe(true);
  });
  it("clamps FX controls into schema ranges", () => {
    const project = projectWith({burstSpeed:-5, fxSpread:1000, fxIntensity:999, fxSize:-5, fxOpacity:1000});
    expect(project.slides[0].layers[0]).toMatchObject({burstSpeed:.2, fxSpread:200, fxIntensity:150, fxSize:50, fxOpacity:100});
    expect(projectSchema.safeParse(project).success).toBe(true);
  });
});
describe("bounded particle renderer", () => {
  it.each(fxOptions)("builds deterministic layered %s particles", burstEffect => {
    const layer = {...defaultImage("", ""), burstEffect};
    const scene = createFXScene(layer, "seed");
    expect(scene).toEqual(createFXScene(layer, "seed"));
    expect(scene.particles.some(p => p.front)).toBe(true);
    expect(scene.particles.some(p => !p.front)).toBe(true);
    expect(scene.particles.length).toBeLessThanOrEqual(102);
    expect(scene.particles.every(p => p.delay + p.life <= 1)).toBe(true);
  });
  it("caps backing resolution even for huge imported layers and retina displays", () => {
    for (const [w,h,dpr] of [[1600,1000,4],[40000,20000,3],[320,200,2]]) {
      const size = canvasResolution(w,h,dpr);
      expect(size.width * size.height).toBeLessThanOrEqual(MAX_FX_PIXELS);
      expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(1536);
    }
  });
});
