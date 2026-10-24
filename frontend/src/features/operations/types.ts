import type { SiteGenerationUsage, GenerationTotals } from "@/components/site-generation-usage";
export type ApprovalMode = "automatic" | "human_review";

export type OperationStatus =
  | "scheduled"
  | "queued"
  | "searching"
  | "analyzing"
  | "generating"
  | "deploying"
  | "awaiting_approval"
  | "sending"
  | "completed"
  | "failed"
  | "cancelled";

export interface Operation {
  id: string;
  organization_id: string;
  niche: string;
  city: string;
  target_count: number;
  approval_mode: ApprovalMode;
  status: OperationStatus;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  message_template: string;
  found_count: number;
  analyzed_count: number;
  generated_count: number;
  sent_count: number;
  discarded_count: number;
  blocked_count: number;
  current_company_id: string | null;
  current_company_name: string | null;
  current_stage: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

export interface OperationCompany {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  other_phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  website: string | null;
  maps_url: string | null;
  social_links: string[];
  listed_at: string;
  status: string;
  discard_reason: string | null;
  score: number | null;
  generated_site_url: string | null;
  site_generation_usage?: SiteGenerationUsage | null;
  final_message: string | null;
  updated_at: string;
}

export interface OperationDetail extends Operation {
  generation_totals?: GenerationTotals;
  delivery: { test_mode: boolean; test_number: string | null };
  companies: OperationCompany[];
}

export interface CreateOperationInput {
  organization_id: string;
  niche: string;
  city: string;
  target_count: number;
  approval_mode: ApprovalMode;
  message_template: string;
  scheduled_for?: string;
}
