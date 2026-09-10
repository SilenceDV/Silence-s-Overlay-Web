import "server-only";

/**
 * Send a best-effort public Supabase Realtime Broadcast to an already-open
 * hosted overlay. The payload contains no project data; it only tells the
 * browser source that a newer saved project version is available, after which
 * the browser source fetches the canonical project through our own API.
 *
 * Broadcast failures must never make an editor save fail. The polling fallback
 * in OverlayClient will still catch the latest saved state.
 */
export async function broadcastOverlayUpdate(publicId: string, version: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !publicId) return;

  const topic = encodeURIComponent(`overlay:${publicId}`);
  const event = encodeURIComponent("project-updated");

  try {
    await fetch(`${url}/realtime/v1/api/broadcast/${topic}/events/${event}`, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version }),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Realtime is an acceleration path, not part of save correctness.
  }
}
