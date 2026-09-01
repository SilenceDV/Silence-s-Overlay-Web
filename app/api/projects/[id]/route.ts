import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { enforceProjectEntitlements, getEntitlements } from "@/lib/billing/entitlements";
import { apiError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validation/projectSchemas";
import { duplicateProject, normalizeProjectId } from "@/lib/projects/projectIds";
type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try { const user = await requireUser(); const id = normalizeProjectId((await context.params).id); const { data, error } = await createSupabaseAdminClient().from("projects").select("id,name,data,version,updated_at").eq("id", id).eq("owner_id", user.id).single(); if (error) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" }); return NextResponse.json(data); }
  catch (error) { return apiError(error, 404); }
}
export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser(); const id = normalizeProjectId((await context.params).id); const body = await request.json(); body.project.id=normalizeProjectId(body.project.id);const project = projectSchema.parse(body.project);
    if (project.id !== id) throw new Error("Project ID mismatch");
    enforceProjectEntitlements(project.slides.length, await getEntitlements(user.id));
    const { data, error } = await createSupabaseAdminClient().from("projects").update({ name: project.name, data: project, version: Number(body.version) + 1, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).eq("version", body.version).select("version,updated_at").maybeSingle();
    if (error) throw error;
    if (!data) { const { data: current, error: lookupError } = await createSupabaseAdminClient().from("projects").select("version").eq("id", id).eq("owner_id", user.id).maybeSingle(); if (lookupError) throw lookupError; return NextResponse.json({ code: "STALE_VERSION", message: "A newer version of this project is already saved.", version: current?.version }, { status: 409 }); }
    return NextResponse.json(data);
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(); const id = normalizeProjectId((await context.params).id); const body = await request.json(); const db = createSupabaseAdminClient();
    if (body.action === "duplicate") {
      const { data: source, error: sourceError } = await db.from("projects").select("data").eq("id", id).eq("owner_id", user.id).single(); if (sourceError) throw sourceError;
      const project = duplicateProject(projectSchema.parse(source.data)); enforceProjectEntitlements(project.slides.length, await getEntitlements(user.id));
      const { data, error } = await db.from("projects").insert({ id: project.id, owner_id: user.id, name: project.name, data: project, version: 1 }).select("id,name,version,updated_at").single(); if (error) throw error; return NextResponse.json(data, { status: 201 });
    }
    const name = String(body.name || "").trim().slice(0, 200); if (!name) throw new Error("Name is required");
    const { data, error } = await db.rpc("rename_project", { p_id: id, p_owner_id: user.id, p_name: name, p_version: Number(body.version) }); if (error) throw error;
    if (!data?.length) return NextResponse.json({ code: "STALE_VERSION", message: "The project changed; refresh before renaming." }, { status: 409 });
    return NextResponse.json(data[0]);
  } catch (error) { return apiError(error); }
}
export async function DELETE(_: Request, context: Context) { try { const user = await requireUser(); const id = normalizeProjectId((await context.params).id); const { error } = await createSupabaseAdminClient().from("projects").delete().eq("id", id).eq("owner_id", user.id); if (error) throw error; return new NextResponse(null, { status: 204 }); } catch (error) { return apiError(error); } }
