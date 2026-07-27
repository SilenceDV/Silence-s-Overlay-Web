import "server-only";import {z} from "zod";
const schema=z.object({NEXT_PUBLIC_SUPABASE_URL:z.string().url(),NEXT_PUBLIC_SUPABASE_ANON_KEY:z.string().min(1),SUPABASE_SERVICE_ROLE_KEY:z.string().min(1),STRIPE_SECRET_KEY:z.string().min(1),STRIPE_WEBHOOK_SECRET:z.string().min(1),STRIPE_PRO_PRICE_ID:z.string().startsWith("price_"),NEXT_PUBLIC_APP_URL:z.string().url(),PAYMENT_GRACE_PERIOD_DAYS:z.coerce.number().int().min(0).max(30).default(3)});
export const serverEnv=()=>schema.parse(process.env);
