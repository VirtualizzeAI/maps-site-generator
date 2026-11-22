export interface ProspectingBoard {
  id: string;
  organization_id: string;
  name: string;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectingStage {
  id: string;
  organization_id: string;
  board_id: string;
  name: string;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectingCard {
  id: string;
  organization_id: string;
  board_id: string;
  stage_id: string;
  result_id: string;
  company_key: string;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
