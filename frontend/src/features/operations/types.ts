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
