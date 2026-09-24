import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const overlayTransparency = `<style id="hosted-overlay-transparency">
html,body,#app,#design,#canvasArea,#stageViewport,#stage,#overlayContent,#animWrap{
  background:rgba(0,0,0,0)!important;
  background-color:rgba(0,0,0,0)!important;
}
html,body{
  margin:0!important;
  width:100%!important;
  height:100%!important;
  overflow:hidden!important;
  color-scheme:normal!important;
}
</style>`;

export async function GET(request: Request) {
  let html = await readFile(join(process.cwd(), "archive", "Overlay4-legacy.html"), "utf8");
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "overlay") {
    html = html.replace("</head>", `${overlayTransparency}</head>`);
  }
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
