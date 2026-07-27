import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ code: "LOGOUT_FAILED", message: "Unable to log out safely." }, { status: 500 });
  return NextResponse.redirect(new URL("/", req.url), 303);
}
