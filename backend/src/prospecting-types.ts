import type { AnalysisUsage } from "./integrations/advanced-analyzer.js";
export interface ProspectingOperation {
 id:string;organization_id:string;created_by:string;niche:string;city:string;target_count:number;
 collect_linkedin:boolean;collect_contacts:boolean;model:"gpt-6-luna"|"gpt-6.1-sol"|"gpt-6-astra";
 status:"queued"|"searching"|"analyzing"|"completed"|"failed";found_count:number;analyzed_count:number;duplicate_count:number;
 current_company:string|null;error_message:string|null;discovery_usage:AnalysisUsage|null;created_at:string;updated_at:string;started_at:string|null;finished_at:string|null;
}
export interface ProspectingReport {
 research_version?:2;
 registration?:ProspectingRegistration|null;
 founders?:ProspectingFounder[];
 summary:string;address:string|null;website:string|null;linkedin_company:string|null;
 responsible:{name:string;role:string;profile_url:string;source_url:string;evidence:string;confirmation:"confirmed"|"uncertain"}[];
 social_links:{url:string;source_url:string}[];phones:{number:string;source_url:string}[];sources:string[];notes:string[];
}
export interface ProspectingRegistration {
 cnpj:string;legal_name:string;status:string;address:string;source_url:string;identity_evidence:string;
 partners:{name:string;role:string;source_url:string}[];
 phones:{number:string;source_url:string}[];
 emails:{email:string;source_url:string}[];
}
export interface ProspectingFounder {
 name:string;relationship:"founder"|"partner";source_url:string;evidence:string;confirmation:"confirmed"|"uncertain";
 profiles:{url:string;source_url:string}[];
 contacts:{kind:"phone"|"email";value:string;source_url:string}[];
 medical_registrations:{number:string;uf:string;status:string;source_url:string;identity_evidence:string;official_confirmation:boolean}[];
}
export interface ProspectingResult {
 id:string;organization_id:string;operation_id:string;company_key:string;name:string;city:string;address:string|null;website:string|null;source_url:string;
 status:"pending"|"completed"|"inconclusive";report:ProspectingReport|null;usage:AnalysisUsage|null;created_at:string;updated_at:string;
}
