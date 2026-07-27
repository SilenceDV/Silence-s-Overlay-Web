import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { requireUser } from "@/lib/auth/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
export default async function Dashboard() {
  const user = await requireUser(); const db = createSupabaseAdminClient();
  const [projects, overlays, entitlements] = await Promise.all([db.from("projects").select("id,name,version,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }), db.from("overlays").select("project_id,public_id,enabled,requires_pro").eq("owner_id", user.id), getEntitlements(user.id)]);
  if (projects.error) throw projects.error; if (overlays.error) throw overlays.error;
  return <main className="page wide"><nav className="nav"><Link href="/">Silence&apos;s Overlay Maker</Link><div><Link href="/billing">Billing</Link><form action="/api/auth/logout" method="post"><button>Log out</button></form></div></nav><DashboardClient initialProjects={projects.data ?? []} initialOverlays={overlays.data ?? []} plan={entitlements.plan} proAccess={entitlements.proAccess}/></main>;
}
