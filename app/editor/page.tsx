import { redirect } from "next/navigation";
import { OverlayEditor } from "@/components/editor/OverlayEditor";
import { requireUser } from "@/lib/auth/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { defaultProject } from "@/lib/editor/defaults";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validation/projectSchemas";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (process.env.NODE_ENV === "development" && process.env.PARITY_HARNESS === "1") {
    const project = defaultProject();
    project.id = "00000000-0000-4000-8000-000000000017";
    return <OverlayEditor initialProject={project} projectId={project.id} version={1} proAccess />;
  }

  const user = await requireUser();
  const { id } = await searchParams;
  if (!id) redirect("/dashboard");
  const [{ data }, entitlements] = await Promise.all([
    createSupabaseAdminClient().from("projects").select("data,version").eq("id",id).eq("owner_id",user.id).maybeSingle(),
    getEntitlements(user.id),
  ]);
  if (!data) redirect("/dashboard");
  return <OverlayEditor initialProject={projectSchema.parse(data.data)} projectId={id} version={data.version} proAccess={entitlements.proAccess}/>;
}
