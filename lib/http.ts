import {NextResponse} from "next/server";
export const apiError=(error:unknown,status=400)=>{const value=error as {message?:string;code?:string};return NextResponse.json({code:value.code??"REQUEST_FAILED",message:value.message??"Request failed"},{status:value.code==="PRO_REQUIRED"?403:status})};
export function safeNext(value: string | null, fallback = "/dashboard") {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (value.includes("\\") || decoded.includes("\\") || !decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    const origin = "https://app.invalid";
    const resolved = new URL(decoded, origin);
    return resolved.origin === origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : fallback;
  } catch { return fallback; }
}
