import { NextResponse } from "next/server";
import { fetchOverlayState } from "@/lib/overlays/fetchOverlay";
import { isLegacyPublishedSnapshot } from "@/lib/overlays/legacy";
import { publicIdSchema } from "@/lib/validation/overlaySchemas";

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const publicId = publicIdSchema.parse((await params).publicId);
  const { overlay } = await fetchOverlayState(publicId);
  if (!overlay || !isLegacyPublishedSnapshot(overlay.snapshot)) return NextResponse.json({ message: "Legacy overlay not found" }, { status: 404 });
  return NextResponse.json(overlay.snapshot.legacyProject, { headers: { "cache-control": "no-store" } });
}
