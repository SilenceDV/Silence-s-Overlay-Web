import { z } from "zod";export const publicIdSchema=z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);export const publishRequestSchema=z.object({projectId:z.string().uuid()});
