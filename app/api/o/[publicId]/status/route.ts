import {NextResponse} from "next/server";
import {fetchOverlayState} from "@/lib/overlays/fetchOverlay";

export async function GET(_:Request,{params}:{params:Promise<{publicId:string}>}){
  const {publicId}=await params;
  const {active,overlay}=await fetchOverlayState(publicId);
  return NextResponse.json(
    {active,project:overlay?.snapshot??null},
    {headers:{"Cache-Control":"no-store, max-age=0"}},
  );
}
