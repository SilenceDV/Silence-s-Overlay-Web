import { z } from "zod";export const importEnvelopeSchema=z.record(z.unknown()).refine(v=>Array.isArray(v.slides),"A slides array is required");
