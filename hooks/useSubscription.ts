"use client"; import { useEffect,useState } from "react"; import type { Entitlements } from "@/types/billing";
export function useSubscription(){const [value,setValue]=useState<Entitlements|null>(null);useEffect(()=>{fetch("/api/subscription").then(r=>r.ok?r.json():null).then(setValue).catch(()=>setValue(null));},[]);return value;}
