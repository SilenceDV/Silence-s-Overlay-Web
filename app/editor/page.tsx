import { redirect } from "next/navigation";
import { OverlayEditor } from "@/components/editor/OverlayEditor";
import { requireUser } from "@/lib/auth/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { defaultProject } from "@/lib/editor/defaults";
import { normalizeProjectId } from "@/lib/projects/projectIds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validation/projectSchemas";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (process.env.NODE_ENV === "development" && process.env.PARITY_HARNESS === "1") {
    const project = defaultProject();
    project.id = "00000000-0000-4000-8000-000000000017";
    return <OverlayEditor initialProject={project} projectId={project.id} version={1} proAccess />;
  }

  const user = await requireUser();
  const { id: rawId } = await searchParams;
  if (!rawId) redirect("/dashboard");
  let id: string;
  try { id = normalizeProjectId(rawId); } catch { redirect("/dashboard"); }
  const [{ data }, entitlements] = await Promise.all([
    createSupabaseAdminClient().from("projects").select("data,version").eq("id",id).eq("owner_id",user.id).maybeSingle(),
    getEntitlements(user.id),
  ]);
  if (!data) redirect("/dashboard");
  const project = projectSchema.parse(data.data);
  project.id = id;
  return <OverlayEditor initialProject={project} projectId={id} version={data.version} proAccess={entitlements.proAccess}/>;
}
