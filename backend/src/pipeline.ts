import { config } from "./config.js";
import { id, now } from "./auth.js";
import { analyzePresence } from "./integrations/analyzer.js";
import { searchCompanies } from "./integrations/search.js";
import { createSite } from "./integrations/site.js";
import { sendWhatsApp } from "./integrations/whatsapp.js";
import { identities, normalizeText } from "./normalization.js";
import { store } from "./store.js";
import type { Company, IntegrationSettings, Message, Operation, OperationCompany, SearchCandidate } from "./types.js";

let processing=false;
const event=(operationId:string,type:string,payload:Record<string,unknown>,operationCompanyId:string|null=null)=>({id:id(),operation_id:operationId,operation_company_id:operationCompanyId,event_type:type,payload,created_at:now()});
const message=(template:string,company:Company,url:string)=>template.replaceAll("{{empresa}}",company.name).replaceAll("{{nome_empresa}}",company.name).replaceAll("{{cidade}}",company.city||"").replaceAll("{{segmento}}",company.category||"").replaceAll("{{link}}",url).replaceAll("{{site_url}}",url);

function integrationFor(operation:Operation):IntegrationSettings{
  const found=store.snapshot().integrations.find(item=>item.organization_id===operation.organization_id);
  if(!found)throw new Error("Configurações de integração não encontradas");return found;
}

export async function processNext(){
  if(processing)return false;const db=store.snapshot(),operation=db.operations.filter(item=>item.status==="queued"||item.status==="scheduled"&&!!item.scheduled_for&&new Date(item.scheduled_for)<=new Date()).sort((a,b)=>a.created_at.localeCompare(b.created_at))[0];if(!operation)return false;
  processing=true;try{await processOperation(operation.id)}finally{processing=false}return true;
}

export async function processOperation(operationId:string){
  let operation=store.snapshot().operations.find(item=>item.id===operationId);if(!operation)return;
  await store.mutate(db=>{const target=db.operations.find(item=>item.id===operationId)!;target.status="searching";target.current_stage="Buscando empresas";target.current_company_id=null;target.current_company_name=null;target.started_at ||= now();target.updated_at=now();db.events.push(event(operationId,"operation_started",{}))});
  try{
    operation=store.snapshot().operations.find(item=>item.id===operationId)!;const integration=integrationFor(operation),candidates=await searchCompanies(operation.niche,operation.city,operation.target_count,integration);
    await store.mutate(db=>{const target=db.operations.find(item=>item.id===operationId)!;target.found_count=candidates.length;target.status="analyzing";target.current_stage="Analisando presença digital";target.updated_at=now();db.events.push(event(operationId,"search_completed",{found:candidates.length}))});
    for(const candidate of candidates){
      await store.mutate(db=>{const target=db.operations.find(item=>item.id===operationId)!;target.current_company_name=candidate.name;target.current_stage="Verificando presença digital";target.updated_at=now()});
      await processCandidate(operationId,candidate,integration);
    }
    await store.mutate(db=>{const target=db.operations.find(item=>item.id===operationId)!;const linkIds=db.operationCompanies.filter(item=>item.operation_id===operationId).map(item=>item.id),pending=db.messages.some(item=>linkIds.includes(item.operation_company_id)&&item.status==="pending_approval");target.status=pending?"awaiting_approval":"completed";target.current_company_id=null;target.current_company_name=null;target.current_stage=pending?"Aguardando aprovação das mensagens":"Operação concluída";target.finished_at=pending?null:now();target.updated_at=now();db.events.push(event(operationId,"operation_finished",{status:target.status}))});
  }catch(error){await store.mutate(db=>{const target=db.operations.find(item=>item.id===operationId);if(target){target.status="failed";target.current_stage="Operação interrompida";target.current_company_id=null;target.current_company_name=null;target.error_message=error instanceof Error?error.message:String(error);target.finished_at=now();target.updated_at=now();db.events.push(event(operationId,"operation_failed",{error:target.error_message}))}})}
}

async function processCandidate(operationId:string,candidate:SearchCandidate,integration:IntegrationSettings){
  const prepared=await store.mutate(db=>{
    const operation=db.operations.find(item=>item.id===operationId)!;const candidateIds=identities(candidate);let company=db.companies.find(item=>item.organization_id===operation.organization_id&&item.identities.some(identity=>candidateIds.includes(identity)));
    if(!company){const timestamp=now();company={id:id(),organization_id:operation.organization_id,name:candidate.name,normalized_name:normalizeText(candidate.name),phone:candidate.phone,address:candidate.address,city:candidate.city,category:candidate.category,website:candidate.website,source:"google_maps",source_id:candidate.source_id,identities:candidateIds,raw_data:{...candidate},first_seen_at:timestamp,prospected_at:null,prospected_operation_id:null,created_at:timestamp,updated_at:timestamp};db.companies.push(company)}
    if(db.operationCompanies.some(item=>item.operation_id===operationId&&item.company_id===company!.id))return null;
    const timestamp=now(),link:OperationCompany={id:id(),organization_id:operation.organization_id,operation_id:operationId,company_id:company.id,status:"found",discard_reason:null,score:null,generated_site_url:null,final_message:null,created_at:timestamp,updated_at:timestamp};db.operationCompanies.push(link);operation.current_company_id=company.id;operation.current_company_name=company.name;operation.current_stage="Verificando presença digital";
    const previous=db.operationCompanies.some(item=>item.company_id===company!.id&&item.operation_id!==operationId&&item.status!=="failed");
    if(company.prospected_at||previous){link.status="blocked_history";link.discard_reason="Empresa já registrada em uma operação anterior";operation.blocked_count++;db.events.push(event(operationId,"company_blocked",{company:company.name},link.id));return null}
    return {company:structuredClone(company),linkId:link.id};
  });if(!prepared)return;
  try{
    const analysis=await analyzePresence(candidate);
    if(analysis.decision!=="eligible"){await store.mutate(db=>{const op=db.operations.find(item=>item.id===operationId)!,link=db.operationCompanies.find(item=>item.id===prepared.linkId)!;op.analyzed_count++;op.discarded_count++;link.score=analysis.score;link.status=analysis.decision;link.discard_reason="reason" in analysis.evidence?String(analysis.evidence.reason):"Empresa já possui presença digital suficiente";link.updated_at=now();db.events.push(event(operationId,"company_discarded",{company:prepared.company.name,reason:link.discard_reason},link.id))});return}
    await store.mutate(db=>{const op=db.operations.find(item=>item.id===operationId)!,link=db.operationCompanies.find(item=>item.id===prepared.linkId)!;op.analyzed_count++;op.current_stage="Gerando e publicando site";link.score=analysis.score;link.status="generating";link.updated_at=now()});
    const site=await createSite(candidate,integration),currentOperation=store.snapshot().operations.find(item=>item.id===operationId)!;const content=message(currentOperation.message_template,prepared.company,site.url);
    await store.mutate(async db=>{const op=db.operations.find(item=>item.id===operationId)!,link=db.operationCompanies.find(item=>item.id===prepared.linkId)!,company=db.companies.find(item=>item.id===prepared.company.id)!;op.generated_count++;link.generated_site_url=site.url;link.final_message=content;op.current_stage=op.approval_mode==="human_review"?"Preparando mensagem para aprovação":"Enviando mensagem";const timestamp=now(),record:Message={id:id(),operation_company_id:link.id,recipient:company.phone||"",delivered_to:null,test_mode:false,content,status:op.approval_mode==="human_review"?"pending_approval":"sending",approved_by:null,approved_at:null,provider_message_id:null,sent_at:null,error_message:null,created_at:timestamp,updated_at:timestamp};db.messages.push(record);if(op.approval_mode==="human_review"){link.status="awaiting_approval"}else{const sent=await sendWhatsApp(record.recipient,content,integration);record.provider_message_id=sent.providerMessageId;record.delivered_to=sent.actualRecipient;record.test_mode=sent.redirected;record.status="sent";record.sent_at=now();record.updated_at=now();link.status="sent";company.prospected_at=now();company.prospected_operation_id=operationId;op.sent_count++}link.updated_at=now();db.events.push(event(operationId,"company_processed",{company:company.name,status:link.status,test_mode:record.test_mode,delivered_to:record.delivered_to},link.id))});
  }catch(error){await store.mutate(db=>{const link=db.operationCompanies.find(item=>item.id===prepared.linkId);if(link){link.status="failed";link.discard_reason=error instanceof Error?error.message:String(error);link.updated_at=now();db.events.push(event(operationId,"company_failed",{error:link.discard_reason},link.id))}})}
}

export function startWorker(){const timer=setInterval(()=>void processNext(),config.workerPollMs);timer.unref();void processNext();return timer}
