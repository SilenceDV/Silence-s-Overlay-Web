import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { enforcePremiumAnimations, enforceProjectEntitlements, getEntitlements, projectUsesPremiumAnimations } from "@/lib/billing/entitlements";
import { sanitizePublishedProject } from "@/lib/editor/serialization";
import { apiError } from "@/lib/http";
import { createLegacyPublishedSnapshot } from "@/lib/overlays/legacy";
import { normalizeProjectId } from "@/lib/projects/projectIds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { publishRequestSchema } from "@/lib/validation/overlaySchemas";
import { projectSchema } from "@/lib/validation/projectSchemas";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const raw = await req.json();
    if (raw.projectId) raw.projectId = normalizeProjectId(raw.projectId);
    const input = publishRequestSchema.parse(raw);
    const db = createSupabaseAdminClient();
    let projectId: string;
    let project;
    let snapshot;

    if ("legacyProject" in input) {
      projectId = input.projectId ?? randomUUID();
      const legacySnapshot = createLegacyPublishedSnapshot(input.legacyProject, projectId);
      project = legacySnapshot.project;
      snapshot = legacySnapshot;
      const { data: owned } = await db.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
      const values = { owner_id: user.id, name: project.name, data: project, updated_at: new Date().toISOString() };
      const stored = owned
        ? await db.from("projects").update(values).eq("id", projectId).eq("owner_id", user.id)
        : await db.from("projects").insert({ id: projectId, ...values, version: 1 });
      if (stored.error) throw stored.error;
    } else {
      projectId = normalizeProjectId(input.projectId);
      const { data: row, error } = await db.from("projects").select("data").eq("id", projectId).eq("owner_id", user.id).single();
      if (error) throw new Error("Project not found");
      project = projectSchema.parse(row.data);
      snapshot = sanitizePublishedProject(project);
    }

    const entitlements = await getEntitlements(user.id);
    enforceProjectEntitlements(project.slides.length, entitlements);
    enforcePremiumAnimations(project, entitlements);
    const requiresPro = project.slides.length > 1 || projectUsesPremiumAnimations(project);
    const existing = await db.from("overlays").select("id,public_id,version").eq("project_id", projectId).eq("owner_id", user.id).maybeSingle();
    const publicId = existing.data?.public_id ?? randomBytes(18).toString("base64url");
    const values = { owner_id: user.id, project_id: projectId, public_id: publicId, snapshot, enabled: true, requires_pro: requiresPro, published_at: new Date().toISOString(), version: (existing.data?.version ?? 0) + 1 };
    const result = existing.data
      ? await db.from("overlays").update(values).eq("id", existing.data.id).eq("owner_id", user.id)
      : await db.from("overlays").insert(values);
    if (result.error) throw result.error;
    return NextResponse.json({ url: `/o/${publicId}`, projectId }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const projectId = normalizeProjectId(body.projectId);
    const db = createSupabaseAdminClient();
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (body.regenerate) patch.public_id = randomBytes(18).toString("base64url");
    const { data, error } = await db.from("overlays").update(patch).eq("project_id", projectId).eq("owner_id", user.id).select("public_id,enabled").single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}
