import { NextResponse } from "next/server";
import { fetchOverlay } from "@/lib/overlays/fetchOverlay";
export async function GET(_: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const overlay = await fetchOverlay(publicId);
  return overlay
    ? new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ active: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
