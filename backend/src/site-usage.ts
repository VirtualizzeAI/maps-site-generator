import type { OperationCompany } from "./types.js";

export interface SiteGenerationUsage {
  source: "openai" | "mock";
  model: string;
  response_id: string | null;
  recorded_at: string;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  cache_write_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  pricing: { input: number; cached: number; write: number; output: number; checked_at: string; source: string } | null;
}

// USD por milhão de tokens, Standard. A tarifa usada fica congelada no registro.
const rates: Record<string, [number, number, number, number]> = {
  "gpt-6-sol": [2, 0.2, 2.5, 10],
  "gpt-6.1-sol": [2, 0.1, 2.5, 10],
  "gpt-5-mini": [0.25, 0.025, 0.25, 2],
  "gpt-5": [1.25, 0.125, 1.25, 10],
  "gpt-4.1-mini": [0.4, 0.1, 0.4, 1.6],
};
const tokens = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" ? value as Record<string, unknown> : {};

export function siteUsage(response: Record<string, unknown>, requestedModel: string): SiteGenerationUsage {
  const usage = object(response.usage), inputDetails = object(usage.input_tokens_details), outputDetails = object(usage.output_tokens_details);
  const input = tokens(usage.input_tokens), output = tokens(usage.output_tokens);
  const cached = tokens(inputDetails.cached_tokens ?? 0), write = tokens(inputDetails.cache_write_tokens ?? 0);
  const model = typeof response.model === "string" ? response.model : requestedModel;
  const baseModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const rate = rates[baseModel];
  const standard = !response.service_tier || response.service_tier === "default";
  const valid = input !== null && output !== null && cached !== null && write !== null && cached + write <= input;
  const long = baseModel.startsWith("gpt-6") && (input ?? 0) > 272000;
  const pricing = rate && standard ? {input: rate[0] * (long ? 2 : 1), cached: rate[1] * (long ? 2 : 1), write: rate[2] * (long ? 2 : 1), output: rate[3] * (long ? 1.5 : 1), checked_at: "2026-10-24", source: `https://developers.openai.com/api/docs/models/${baseModel}`} : null;
  const cost = valid && pricing ? ((input - cached - write) * pricing.input + cached * pricing.cached + write * pricing.write + output * pricing.output) / 1e6 : null;
  return {
    source: "openai", model, response_id: typeof response.id === "string" ? response.id : null, recorded_at: new Date().toISOString(),
    input_tokens: input, cached_input_tokens: cached, cache_write_tokens: write, output_tokens: output,
    reasoning_tokens: tokens(outputDetails.reasoning_tokens ?? 0),
    total_tokens: input !== null && output !== null ? input + output : null,
    estimated_cost_usd: cost === null ? null : Number(cost.toFixed(10)), pricing,
  };
}

export function mockSiteUsage(): SiteGenerationUsage {
  return {...siteUsage({usage:{input_tokens:0,output_tokens:0}}, "mock"), source:"mock", estimated_cost_usd:0};
}

export function summarizeSiteUsage(links: Pick<OperationCompany, "site_generation_usage" | "generated_site_url">[]) {
  const records = links.flatMap(link => link.site_generation_usage ? [link.site_generation_usage] : []);
  return {
    recorded_generations: records.length,
    input_tokens: records.reduce((sum, item) => sum + (item.input_tokens ?? 0), 0),
    output_tokens: records.reduce((sum, item) => sum + (item.output_tokens ?? 0), 0),
    total_tokens: records.reduce((sum, item) => sum + (item.total_tokens ?? 0), 0),
    estimated_cost_usd: Number(records.reduce((sum, item) => sum + (item.estimated_cost_usd ?? 0), 0).toFixed(10)),
    unpriced_generations: records.filter(item => item.estimated_cost_usd === null).length,
    missing_usage: records.filter(item => item.total_tokens === null).length + links.filter(link => link.generated_site_url && !link.site_generation_usage).length,
  };
}
