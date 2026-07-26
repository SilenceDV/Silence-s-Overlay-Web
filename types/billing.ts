export type SubscriptionState = "free"|"trialing"|"active"|"past_due"|"canceled"|"expired";
export interface Entitlements { plan:"free"|"pro"; subscriptionState:SubscriptionState; currentPeriodEnd:string|null; gracePeriodEnd:string|null; maxSlides:number; canPublish:boolean; canUsePremiumAnimations:boolean }
export interface SubscriptionRecord { userId:string; stripeCustomerId:string|null; stripeSubscriptionId:string|null; status:SubscriptionState; currentPeriodEnd:string|null; cancelAtPeriodEnd:boolean }
