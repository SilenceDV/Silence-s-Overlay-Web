import { describe, expect, it } from "vitest";
import { defaultProject } from "@/lib/editor/defaults";
import { normalizeProject } from "@/lib/editor/normalization";
import { duplicateProject, normalizeProjectId, UUID_PATTERN } from "@/lib/projects/projectIds";
import { legacyProjectToCurrent, parseLegacyProject } from "@/lib/overlays/legacy";
import { publishRequestSchema } from "@/lib/validation/overlaySchemas";

const uuid = "d9282c82-2569-4136-b255-d88e938b94c8";

describe("database-bound project IDs", () => {
  it("creates projects with native UUIDs and no project_ prefix", () => { const id=defaultProject().id;expect(id).toMatch(UUID_PATTERN);expect(id).not.toMatch(/^project_/); });
  it("duplicates projects with a new native UUID", () => { const source=defaultProject(),copy=duplicateProject(source);expect(copy.id).toMatch(UUID_PATTERN);expect(copy.id).not.toBe(source.id);expect(copy.id).not.toMatch(/^project_/); });
  it("normalizes an exact legacy project_<uuid> ID", () => expect(normalizeProjectId(`project_${uuid}`)).toBe(uuid));
  it("rejects arbitrary prefixed and malformed IDs", () => { expect(()=>normalizeProjectId(`other_${uuid}`)).toThrow("Invalid project ID");expect(()=>normalizeProjectId("project_not-a-uuid")).toThrow("Invalid project ID"); });
  it("normalizes imported current projects", () => { const project=normalizeProject({...defaultProject(),id:`project_${uuid}`});expect(project.id).toBe(uuid); });
  it("normalizes legacy compatibility projections", () => { const legacy=parseLegacyProject({version:7,settings:{},slides:[{giftName:"Gift",layers:[{type:"text",text:"Hello"}]}]});expect(legacyProjectToCurrent(legacy,`project_${uuid}`).id).toBe(uuid); });
  it("publish validation accepts the normalized UUID", () => expect(publishRequestSchema.parse({projectId:normalizeProjectId(`project_${uuid}`)}).projectId).toBe(uuid));
});
