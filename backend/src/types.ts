export type Role = "admin" | "operator" | "viewer";
export type ApprovalMode = "automatic" | "human_review";
export type OperationStatus =
  | "queued"
  | "scheduled"
  | "searching"
  | "analyzing"
  | "awaiting_approval"
  | "completed"
  | "failed";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Membership {
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
}
export interface IntegrationSettings {
  organization_id: string;
  serper_api_key: string;
  openai_api_key: string;
  openai_model: string;
  site_generation_prompt: string;
  vercel_token: string;
  evolution_url: string;
  evolution_api_key: string;
  evolution_instance: string;
  whatsapp_test_mode: boolean;
  whatsapp_test_number: string;
  updated_at: string;
}
export interface Operation {
  id: string;
  organization_id: string;
  created_by: string;
  niche: string;
  city: string;
  target_count: number;
  approval_mode: ApprovalMode;
  message_template: string;
  status: OperationStatus;
  scheduled_for: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
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
  created_at: string;
  updated_at: string;
}
export interface Company {
  id: string;
  organization_id: string;
  name: string;
  normalized_name: string;
  phone: string | null;
  other_phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  website: string | null;
  maps_url: string | null;
  social_links: string[];
  source: string;
  source_id: string | null;
  identities: string[];
  raw_data: Record<string, unknown>;
  first_seen_at: string;
  prospected_at: string | null;
  prospected_operation_id: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
}
export interface OperationCompany {
  id: string;
  organization_id: string;
  operation_id: string;
  company_id: string;
  status: string;
  discard_reason: string | null;
  score: number | null;
  generated_site_url: string | null;
  final_message: string | null;
  created_at: string;
  updated_at: string;
}
export interface Message {
  id: string;
  organization_id: string;
  operation_company_id: string;
  recipient: string;
  delivered_to: string | null;
  test_mode: boolean;
  content: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
export interface Event {
  id: string;
  organization_id: string;
  operation_id: string | null;
  operation_company_id: string | null;
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  organizations: Organization[];
  users: User[];
  memberships: Membership[];
  integrations: IntegrationSettings[];
  operations: Operation[];
  companies: Company[];
  operationCompanies: OperationCompany[];
  messages: Message[];
  events: Event[];
}

export interface SearchCandidate {
  name: string;
  phone: string | null;
  other_phones: string[];
  email: string | null;
  address: string | null;
  city: string;
  category: string;
  website: string | null;
  maps_url: string | null;
  social_links: string[];
  source_id: string | null;
  raw_data: Record<string, unknown>;
}
