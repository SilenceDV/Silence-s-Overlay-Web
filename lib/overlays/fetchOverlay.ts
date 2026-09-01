import "server-only";
import {createSupabaseAdminClient} from "@/lib/supabase/server";
import {getEntitlements} from "@/lib/billing/entitlements";
import {normalizeProject} from "@/lib/editor/normalization";
import type {PublishedOverlay} from "@/types/editor";

export async function fetchOverlayState(publicId:string):Promise<{active:boolean;overlay:PublishedOverlay|null}>{
  const db=createSupabaseAdminClient();
  const {data}=await db.from("overlays").select("public_id,owner_id,project_id,enabled,requires_pro,snapshot,published_at").eq("public_id",publicId).maybeSingle();
  if(!data)return{active:false,overlay:null};
  const e=await getEntitlements(data.owner_id);
  const active=Boolean(data.enabled)&&(!data.requires_pro||e.hostedProOverlays);
  if(!active)return{active:false,overlay:null};

  // A published URL is a stable pointer to a project, not a frozen copy of it.
  // Prefer the owner's latest saved project data so edits made in the editor are
  // reflected by the existing overlay URL. Fall back to the published snapshot
  // if the project row is unavailable (for example an older legacy publish).
  let snapshot=data.snapshot;
  const {data:projectRow}=await db.from("projects").select("data").eq("id",data.project_id).eq("owner_id",data.owner_id).maybeSingle();
  if(projectRow?.data){
    try{snapshot=normalizeProject(projectRow.data);}catch{/* retain published snapshot */}
  }

  return{active:true,overlay:{publicId:data.public_id,ownerId:data.owner_id,projectId:data.project_id,enabled:true,snapshot,publishedAt:data.published_at}};
}
export async function fetchOverlay(publicId:string){return(await fetchOverlayState(publicId)).overlay}
