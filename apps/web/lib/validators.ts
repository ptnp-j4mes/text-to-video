import { z } from "zod";

export const generationSchema = z.object({
  voiceId: z.string().min(1),
  imageId: z.string().min(1),
  text: z.string().min(1).max(800),
  language: z.string().min(1).default("th"),
  refineLipsync: z.boolean().default(false),
});

