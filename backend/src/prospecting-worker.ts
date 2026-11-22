import {id,now} from "./auth.js";
import {store} from "./store.js";
import {discoverCompanies,researchCompany} from "./integrations/prospecting.js";
import type {ProspectingOperation,ProspectingResult} from "./prospecting-types.js";
import type {AnalysisUsage} from "./integrations/advanced-analyzer.js";
export function prospectingTotals(op:ProspectingOperation,results:ProspectingResult[]) {
 const usages=[op.discovery_usage,...results.map(r=>r.usage)].filter((x):x is AnalysisUsage=>!!x);
 return {estimated_cost_usd:Number(usages.reduce((n,x)=>n+(x.estimated_cost_usd??0),0).toFixed(10)),total_tokens:usages.reduce((n,x)=>n+(x.tokens.total_tokens??0),0),web_search_calls:usages.reduce((n,x)=>n+x.web_search_calls,0),unpriced:usages.filter(x=>x.estimated_cost_usd===null).length+results.filter(r=>r.status!=="pending"&&!r.usage).length+(!op.discovery_usage&&op.status==="failed"?1:0)};
}
export async function processProspectingOperation(operationId:string) {
 let op=store.snapshot().prospectingOperations?.find(x=>x.id===operationId);if(!op||op.status!=="queued")return;
 await store.mutate(db=>{const target=db.prospectingOperations.find(x=>x.id===operationId)!;target.status="searching";target.started_at=now();target.updated_at=now();db.events.push({id:id(),organization_id:target.organization_id,operation_id:null,operation_company_id:null,actor_id:target.created_by,event_type:"prospecting_started",payload:{prospecting_operation_id:operationId},created_at:now()});});
 try{
  const integration=store.snapshot().integrations.find(x=>x.organization_id===op!.organization_id);if(!integration)throw new Error("Integração OpenAI não configurada");
  const discovery=await discoverCompanies(op,integration,async usage=>{await store.mutate(db=>{db.prospectingOperations.find(x=>x.id===operationId)!.discovery_usage=usage;});});
  const seen=new Set<string>();const unique=discovery.companies.filter(c=>{if(seen.has(c.company_key))return false;seen.add(c.company_key);return true;}).slice(0,op.target_count);
  await store.mutate(db=>{const target=db.prospectingOperations.find(x=>x.id===operationId)!;target.found_count=unique.length;target.duplicate_count=discovery.duplicates+discovery.companies.length-unique.length;target.status="analyzing";target.updated_at=now();for(const c of unique)db.prospectingResults.push({id:id(),organization_id:target.organization_id,operation_id:operationId,...c,status:"pending",report:null,usage:null,created_at:now(),updated_at:now()});});
  for(const result of store.snapshot().prospectingResults.filter(x=>x.operation_id===operationId)){
   await store.mutate(db=>{const target=db.prospectingOperations.find(x=>x.id===operationId)!;target.current_company=result.name;target.updated_at=now();});
   try{
    const report=await researchCompany(op,result,integration,async usage=>{await store.mutate(db=>{db.prospectingResults.find(x=>x.id===result.id)!.usage=usage;});});
    await store.mutate(db=>{const target=db.prospectingResults.find(x=>x.id===result.id)!;target.report=report;target.website=report.website||target.website;target.address=report.address||target.address;target.status="completed";target.updated_at=now();});
   }catch(error){await store.mutate(db=>{const target=db.prospectingResults.find(x=>x.id===result.id)!;target.status="inconclusive";target.report={summary:error instanceof Error&&/^Pesquisa indisponível \(OpenAI HTTP \d+\)$/.test(error.message)?error.message:"Não foi possível concluir esta pesquisa. Confira as fontes ou tente outra operação.",address:target.address,website:target.website,linkedin_company:null,responsible:[],social_links:[],phones:[],sources:[target.source_url],notes:["Resultado inconclusivo; dados não confirmados não foram preenchidos."]};target.updated_at=now();});}
   await store.mutate(db=>{const target=db.prospectingOperations.find(x=>x.id===operationId)!;target.analyzed_count++;target.updated_at=now();});
  }
  await store.mutate(db=>{const target=db.prospectingOperations.find(x=>x.id===operationId)!;target.status="completed";target.current_company=null;target.finished_at=now();target.updated_at=now();db.events.push({id:id(),organization_id:target.organization_id,operation_id:null,operation_company_id:null,actor_id:target.created_by,event_type:"prospecting_completed",payload:{prospecting_operation_id:operationId,found:target.found_count},created_at:now()});});
 }catch(error){await store.mutate(db=>{const target=db.prospectingOperations.find(x=>x.id===operationId)!;target.status="failed";target.current_company=null;target.error_message=error instanceof Error&&(/^Pesquisa indisponível|^Chave OpenAI|^A pesquisa|^Integração OpenAI/.test(error.message))?error.message:"Falha ao pesquisar empresas. Nenhuma informação foi inventada para completar a operação.";target.finished_at=now();target.updated_at=now();});}
}
