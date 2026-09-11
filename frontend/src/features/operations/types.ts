export type ApprovalMode = "automatic" | "human_review";

export type OperationStatus =
  | "scheduled"
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
}

export interface CreateOperationInput {
  organization_id: string;
  niche: string;
  city: string;
  target_count: number;
  approval_mode: ApprovalMode;
  message_template: string;
  whatsapp_integration_id?: string;
  scheduled_for?: string;
}
