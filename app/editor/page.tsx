import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { normalizeProjectId } from "@/lib/projects/projectIds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const frameStyle = { position: "fixed", inset: 0, width: "100vw", height: "100vh", border: 0, background: "transparent" } as const;

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (process.env.NODE_ENV === "development" && process.env.PARITY_HARNESS === "1") {
    return <iframe title="Silence's Overlay Maker" src="/legacy-overlay?editor=parity" style={frameStyle} />;
  }

  const user = await requireUser();
  const { id: rawId } = await searchParams;
  if (!rawId) redirect("/dashboard");
  let id: string;
  try { id = normalizeProjectId(rawId); } catch { redirect("/dashboard"); }
  const { data } = await createSupabaseAdminClient().from("projects").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) redirect("/dashboard");
  return <iframe title="Silence's Overlay Maker" src={`/legacy-overlay?editorProjectId=${encodeURIComponent(id)}`} style={frameStyle} />;
}
