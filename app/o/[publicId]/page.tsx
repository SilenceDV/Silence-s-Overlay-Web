import {fetchOverlayState} from "@/lib/overlays/fetchOverlay";
import {isLegacyPublishedSnapshot} from "@/lib/overlays/legacy";
import {OverlayClient} from "./OverlayClient";

export const dynamic="force-dynamic";
export const revalidate=0;

const transparentPageCss=`
html,body{
  margin:0!important;
  width:100%!important;
  height:100%!important;
  min-height:100%!important;
  overflow:hidden!important;
  background:rgba(0,0,0,0)!important;
  background-color:rgba(0,0,0,0)!important;
  color-scheme:normal!important;
}
.overlay-page,
.overlay-only,
#stageViewport,
#stage,
#overlayContent,
#animWrap{
  background:rgba(0,0,0,0)!important;
  background-color:rgba(0,0,0,0)!important;
}
`;

export default async function OverlayPage({params}:{params:Promise<{publicId:string}>}){
  const {publicId}=await params;
  const {overlay}=await fetchOverlayState(publicId);
  return <main className="overlay-page">
    <style>{transparentPageCss}</style>
    {overlay?(isLegacyPublishedSnapshot(overlay.snapshot)
      ?<iframe
        title="Legacy overlay"
        src={`/legacy-overlay?mode=overlay&publicId=${encodeURIComponent(publicId)}`}
        allowTransparency
        style={{position:"fixed",inset:0,width:"100vw",height:"100vh",border:0,background:"rgba(0,0,0,0)",backgroundColor:"rgba(0,0,0,0)"}}
      />
      :<OverlayClient project={overlay.snapshot} publicId={publicId}/>
    ):null}
  </main>;
}
