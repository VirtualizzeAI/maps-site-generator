import { ApiError } from "./auth.js";
import type { Database } from "./types.js";
export type SiteAction = "site_only" | "site_and_outreach";
export function validateSiteAction(db:Database,linkId:string,action:SiteAction) {
 const link=db.operationCompanies.find(x=>x.id===linkId),op=link&&db.operations.find(x=>x.id===link.operation_id),company=link&&db.companies.find(x=>x.id===link.company_id);
 if(!link||!op||!company||op.archived_at||company.archived_at)throw new ApiError(404,"Empresa não encontrada");
 if(op.analysis_mode!=="advanced"||!link.advanced_analysis)throw new ApiError(409,"A ação exige uma análise avançada concluída");
 if(!["completed","awaiting_approval"].includes(op.status))throw new ApiError(409,"Aguarde o processamento da operação terminar");
 if(!["analysis_ready","analysis_inconclusive","discarded_site_real","site_created"].includes(link.status))throw new ApiError(409,"Esta empresa não está disponível para criação manual");
 const related=db.operationCompanies.filter(x=>x.company_id===company.id);
 if(company.prospected_at||related.some(x=>x.id!==link.id&&!["blocked_history","failed"].includes(x.status))||db.messages.some(m=>related.some(l=>l.id===m.operation_company_id)))throw new ApiError(409,"A empresa já possui processamento ou mensagem no histórico");
 if(action==="site_only"&&link.generated_site_url)throw new ApiError(409,"O site desta empresa já foi criado");
 if(action==="site_and_outreach"&&!/^\d{10,15}$/.test((company.phone||"").replace(/\D/g,"")))throw new ApiError(422,"A empresa precisa de um telefone válido para a abordagem");
 return {link,op,company};
}
export function queueSiteAction(db:Database,linkId:string,action:SiteAction,actorId:string,eventId:string,timestamp:string) {
 const {link,op,company}=validateSiteAction(db,linkId,action);
 if(link.status==="discarded_site_real")op.discarded_count=Math.max(0,op.discarded_count-1);
 link.requested_action=action;link.requested_by=actorId;link.status="site_action_queued";link.discard_reason=null;link.updated_at=timestamp;
 op.status="analyzing";op.finished_at=null;op.current_company_id=company.id;op.current_company_name=company.name;op.current_stage="Criação manual na fila";op.updated_at=timestamp;
 db.events.push({id:eventId,organization_id:op.organization_id,operation_id:op.id,operation_company_id:link.id,actor_id:actorId,event_type:"manual_site_action_requested",payload:{action,analysis_decision:link.advanced_analysis?.decision},created_at:timestamp});
}
