import { describe,expect,it } from "vitest";
import { calculateEntitlements,enforceProjectEntitlements,grantInternalProAccess,internalTesterHasProAccess } from "@/lib/billing/entitlements";
import type { SubscriptionRecord } from "@/types/billing";

const sub=(status:SubscriptionRecord["status"],end:string):SubscriptionRecord=>({userId:"u",stripeCustomerId:"c",stripeSubscriptionId:"s",status,currentPeriodEnd:end,cancelAtPeriodEnd:status==="canceled"});

describe("server entitlements",()=>{
  const now=new Date("2026-01-01T00:00:00Z");
  it("limits free projects to one slide",()=>{const e=calculateEntitlements(null,now);expect(e.maxSlides).toBe(1);expect(()=>enforceProjectEntitlements(2,e)).toThrow();});
  it("keeps canceled access through the paid period",()=>expect(calculateEntitlements(sub("canceled","2026-01-02T00:00:00Z"),now).plan).toBe("pro"));
  it("expires access after period end",()=>expect(calculateEntitlements(sub("canceled","2025-12-31T00:00:00Z"),now).plan).toBe("free"));
  it("matches only explicitly configured internal tester user IDs",()=>{expect(internalTesterHasProAccess("user-b","user-a, user-b,user-c")).toBe(true);expect(internalTesterHasProAccess("user-x","user-a, user-b,user-c")).toBe(false);});
  it("grants full Pro entitlements to an internal tester without a Stripe subscription",()=>{const e=grantInternalProAccess(calculateEntitlements(null,now));expect(e.plan).toBe("pro");expect(e.proAccess).toBe(true);expect(e.maxSlides).toBe(100);expect(e.premiumAnimations).toBe(true);expect(e.hostedProOverlays).toBe(true);expect(()=>enforceProjectEntitlements(25,e)).not.toThrow();});
});
