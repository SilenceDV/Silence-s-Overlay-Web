import {NextResponse} from "next/server";
export const apiError=(error:unknown,status=400)=>{const value=error as {message?:string;code?:string};return NextResponse.json({code:value.code??"REQUEST_FAILED",message:value.message??"Request failed"},{status:value.code==="PRO_REQUIRED"?403:status})};
export function safeNext(value:string|null,fallback="/dashboard"){return value?.startsWith("/")&&!value.startsWith("//")?value:fallback}
