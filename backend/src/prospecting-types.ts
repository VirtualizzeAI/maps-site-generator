import type { AnalysisUsage } from "./integrations/advanced-analyzer.js";
export interface ProspectingOperation {
 id:string;organization_id:string;created_by:string;niche:string;city:string;target_count:number;
 collect_linkedin:boolean;collect_contacts:boolean;model:"gpt-6-luna"|"gpt-6.1-sol"|"gpt-6-astra";
 status:"queued"|"searching"|"analyzing"|"completed"|"failed";found_count:number;analyzed_count:number;duplicate_count:number;
 current_company:string|null;error_message:string|null;discovery_usage:AnalysisUsage|null;created_at:string;updated_at:string;started_at:string|null;finished_at:string|null;
}
export interface ProspectingReport {
 summary:string;address:string|null;website:string|null;linkedin_company:string|null;
 responsible:{name:string;role:string;profile_url:string;source_url:string;evidence:string;confirmation:"confirmed"|"uncertain"}[];
 social_links:{url:string;source_url:string}[];phones:{number:string;source_url:string}[];sources:string[];notes:string[];
}
export interface ProspectingResult {
 id:string;organization_id:string;operation_id:string;company_key:string;name:string;city:string;address:string|null;website:string|null;source_url:string;
 status:"pending"|"completed"|"inconclusive";report:ProspectingReport|null;usage:AnalysisUsage|null;created_at:string;updated_at:string;
}
