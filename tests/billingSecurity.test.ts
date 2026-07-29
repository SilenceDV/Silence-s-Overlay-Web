import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const syncSource=readFileSync("lib/billing/subscriptionSync.ts","utf8");
const migration=readFileSync("supabase/migrations/202607290001_secure_privileged_functions.sql","utf8");

describe("ordinary subscription synchronization",()=>{
  it("never writes the suspension decision",()=>{
    const upsert=syncSource.slice(syncSource.indexOf(".upsert({"),syncSource.indexOf("}, { onConflict"));
    expect(upsert).not.toMatch(/suspended\s*:/);
  });
});

describe("privileged function migration",()=>{
  const signatures=[
    "claim_checkout(uuid)",
    "claim_stripe_event(text, text, bigint)",
    "rename_project(uuid, uuid, text, integer)",
    "set_subscription_suspension(text, boolean, bigint, text)",
  ];

  it.each(signatures)("restricts public.%s to service_role",signature=>{
    expect(migration).toContain(`revoke all on function public.${signature} from public, anon, authenticated;`);
    expect(migration).toContain(`grant execute on function public.${signature} to service_role;`);
  });

  it("locks down the trigger-only function",()=>{
    expect(migration).toContain("revoke all on function public.handle_new_user() from public, anon, authenticated;");
    expect(migration).not.toContain("grant execute on function public.handle_new_user()");
  });

  it("uses a separate risk cursor and deterministic equal-time precedence",()=>{
    expect(migration).toContain("last_risk_event_created");
    expect(migration).toContain("last_risk_event_id");
    expect(migration).toContain("(p_suspended and not suspended)");
    expect(migration).toContain("p_event_id > coalesce(last_risk_event_id, '')");
  });

  it("pins every definer function to trusted schemas",()=>{
    const definers=migration.split("security definer").length-1;
    const safePaths=migration.split("set search_path = public, pg_temp").length-1;
    expect(definers).toBe(4);
    expect(safePaths).toBeGreaterThanOrEqual(definers);
  });
});
