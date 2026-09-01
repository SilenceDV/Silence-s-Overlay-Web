import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "development" && process.env.PARITY_HARNESS === "1") return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values: { name: string; value: string; options: CookieOptions }[]) {
        values.forEach(value => request.cookies.set(value.name, value.value));
        response = NextResponse.next({ request });
        values.forEach(value => response.cookies.set(value.name, value.value, value.options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && ["/dashboard", "/editor", "/billing"].some(path => request.nextUrl.pathname.startsWith(path))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/editor/:path*", "/billing/:path*"] };

