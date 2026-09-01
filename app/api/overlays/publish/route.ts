import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { enforceProjectEntitlements, getEntitlements } from "@/lib/billing/entitlements";
import { sanitizePublishedProject } from "@/lib/editor/serialization";
import { apiError } from "@/lib/http";
import { createLegacyPublishedSnapshot } from "@/lib/overlays/legacy";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { publishRequestSchema } from "@/lib/validation/overlaySchemas";
import { projectSchema } from "@/lib/validation/projectSchemas";
import { normalizeProjectId } from "@/lib/projects/projectIds";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = await req.json();
    if (input.projectId) input.projectId = normalizeProjectId(input.projectId);
    const body = publishRequestSchema.parse(input);
    const db = createSupabaseAdminClient();
    let projectId = body.projectId;
    let project;
    let snapshot: unknown;
    if ("legacyProject" in body) {
      const id = projectId ?? randomUUID();
      const legacy = createLegacyPublishedSnapshot(body.legacyProject, id);
      project = legacy.project;
      snapshot = legacy;
      if (projectId) {
        const owned = await db.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).single();
        if (owned.error || owned.data?.id !== projectId) throw new Error("Project not found");
        const update = await db.from("projects").update({ data: project, name: project.name, updated_at: new Date().toISOString() }).eq("id", projectId).eq("owner_id", user.id);
        if (update.error) throw update.error;
      } else {
        projectId = id;
        const created = await db.from("projects").insert({ id, owner_id: user.id, name: project.name, data: project });
        if (created.error) throw created.error;
      }
    } else {
      const row = await db.from("projects").select("data").eq("id", projectId).eq("owner_id", user.id).single();
      if (row.error) throw new Error("Project not found");
      project = projectSchema.parse(row.data.data);
      snapshot = sanitizePublishedProject(project);
    }
    const entitlements = await getEntitlements(user.id);
    enforceProjectEntitlements(project.slides.length, entitlements);
    const requiresPro = project.slides.length > 1 || project.slides.some(slide => slide.layers.some(layer => layer.animation.type !== "none"));
    if (requiresPro && !entitlements.proAccess) enforceProjectEntitlements(2, entitlements);
    const existing = await db.from("overlays").select("id,public_id,version").eq("project_id", projectId).eq("owner_id", user.id).maybeSingle();
    const publicId = existing.data?.public_id ?? randomBytes(18).toString("base64url");
    const values = { owner_id: user.id, project_id: projectId, public_id: publicId, snapshot, enabled: true, requires_pro: requiresPro, published_at: new Date().toISOString(), version: (existing.data?.version ?? 0) + 1 };
    const result = existing.data ? await db.from("overlays").update(values).eq("id", existing.data.id).eq("owner_id", user.id) : await db.from("overlays").insert(values);
    if (result.error) throw result.error;
    return NextResponse.json({ url: `/o/${publicId}`, projectId }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(), body = await req.json(), db = createSupabaseAdminClient();
    body.projectId = normalizeProjectId(body.projectId);
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (body.regenerate) patch.public_id = randomBytes(18).toString("base64url");
    const { data, error } = await db.from("overlays").update(patch).eq("project_id", body.projectId).eq("owner_id", user.id).select("public_id,enabled").single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) { return apiError(error); }
}
