import { z } from "zod";
export const analysisModels = ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"] as const;
export const operationSchema = z.object({
  organization_id: z.string().uuid(), niche: z.string().min(2).max(120), city: z.string().min(2).max(160),
  target_count: z.number().int().min(1).max(500), approval_mode: z.enum(["automatic", "human_review"]),
  message_template: z.string().min(1).max(4000), scheduled_for: z.string().nullish(),
  analysis_mode: z.enum(["standard", "advanced"]).default("standard"),
  analysis_model: z.enum(analysisModels).nullish(),
}).transform(value => ({...value, analysis_model: value.analysis_mode === "advanced" ? value.analysis_model ?? "gpt-6.1-sol" : null}));
