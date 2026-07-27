import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createSupabaseServerClient(){const store=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll(values:{name:string;value:string;options:CookieOptions}[]){try{values.forEach(({name,value,options})=>store.set(name,value,options));}catch{}}}});}
export function createSupabaseAdminClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase server credentials are not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
