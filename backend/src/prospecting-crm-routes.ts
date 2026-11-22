import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {ApiError,currentUser,membership,id,now} from "./auth.js";
import {store} from "./store.js";
import type {Database} from "./types.js";

const root="/api/v1/prospecting/crm";
const uuid=z.string().uuid();
const boardInput=z.object({organization_id:uuid,name:z.string().trim().min(1).max(100)}).strict();
const boardEdit=boardInput.pick({name:true});
const stageInput=z.object({name:z.string().trim().min(1).max(80)}).strict();
const stageEdit=stageInput.extend({position:z.number().int().min(0).max(99).optional()});
const stageDelete=z.object({destination_stage_id:uuid.optional()}).strict();
const cardInput=z.object({board_id:uuid,stage_id:uuid,result_id:uuid}).strict();
const cardMove=z.object({stage_id:uuid,expected_stage_id:uuid}).strict();
function param(request:{params:unknown}) {return uuid.parse((request.params as {id:string}).id);}
function board(db:Database,boardId:string){const b=db.prospectingBoards.find(x=>x.id===boardId&&!x.deleted_at);if(!b)throw new ApiError(404,"Kanban não encontrado");return b;}
function stage(db:Database,stageId:string,boardId:string){const s=db.prospectingStages.find(x=>x.id===stageId&&x.board_id===boardId&&!x.deleted_at);if(!s)throw new ApiError(409,"A etapa não está disponível neste kanban. Atualize e tente novamente.");return s;}
function stages(db:Database,boardId:string){return db.prospectingStages.filter(x=>x.board_id===boardId&&!x.deleted_at).sort((a,b)=>a.position-b.position||a.created_at.localeCompare(b.created_at));}
function audit(db:Database,org:string,actor:string,type:string,payload:Record<string,unknown>){db.events.push({id:id(),organization_id:org,operation_id:null,operation_company_id:null,actor_id:actor,event_type:type,payload,created_at:now()});}
function summary(db:Database,b:Database["prospectingBoards"][number]){const cards=db.prospectingCards.filter(c=>c.board_id===b.id&&!c.deleted_at);return {...b,card_count:cards.length,stages:stages(db,b.id).map(s=>({...s,card_count:cards.filter(c=>c.stage_id===s.id).length}))};}

export function registerProspectingCrmRoutes(app:FastifyInstance){
 app.get(root+"/boards",async request=>{
  const user=await currentUser(request),org=uuid.parse((request.query as {organization_id?:string}).organization_id);membership(user.id,org);
  const db=store.snapshot();return db.prospectingBoards.filter(b=>b.organization_id===org&&!b.deleted_at).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(b=>summary(db,b));
 });
 app.get(root+"/boards/:id",async request=>{
  const user=await currentUser(request),db=store.snapshot(),b=board(db,param(request));membership(user.id,b.organization_id);
  return {...summary(db,b),cards:db.prospectingCards.filter(c=>c.board_id===b.id&&!c.deleted_at).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(c=>{const result=db.prospectingResults.find(r=>r.id===c.result_id)!,op=db.prospectingOperations.find(o=>o.id===result.operation_id)!;return {...c,result,operation:{id:op.id,niche:op.niche,city:op.city,model:op.model,collect_linkedin:op.collect_linkedin,collect_contacts:op.collect_contacts}};})};
 });
 app.post(root+"/boards",async request=>{
  const user=await currentUser(request),input=boardInput.parse(request.body);membership(user.id,input.organization_id,["admin","operator"]);
  return store.mutate(db=>{const stamp=now(),b={...input,id:id(),created_by:user.id,deleted_at:null,created_at:stamp,updated_at:stamp};db.prospectingBoards.push(b);for(const [position,name] of ["Novas empresas","Em contato","Negociação","Concluído"].entries())db.prospectingStages.push({id:id(),organization_id:b.organization_id,board_id:b.id,name,position,deleted_at:null,created_at:stamp,updated_at:stamp});audit(db,b.organization_id,user.id,"prospecting_board_created",{board_id:b.id});return summary(db,b);});
 });
 app.patch(root+"/boards/:id",async request=>{
  const user=await currentUser(request),input=boardEdit.parse(request.body),boardId=param(request);
  return store.mutate(db=>{const b=board(db,boardId);membership(user.id,b.organization_id,["admin","operator"]);b.name=input.name;b.updated_at=now();audit(db,b.organization_id,user.id,"prospecting_board_updated",{board_id:b.id,name:b.name});return summary(db,b);});
 });
 app.delete(root+"/boards/:id",async request=>{
  const user=await currentUser(request),boardId=param(request);
  return store.mutate(db=>{const b=board(db,boardId);membership(user.id,b.organization_id,["admin","operator"]);b.deleted_at=now();b.updated_at=b.deleted_at;audit(db,b.organization_id,user.id,"prospecting_board_deleted",{board_id:b.id});return {ok:true};});
 });
 app.post(root+"/boards/:id/stages",async request=>{
  const user=await currentUser(request),input=stageInput.parse(request.body),boardId=param(request);
  return store.mutate(db=>{const b=board(db,boardId);membership(user.id,b.organization_id,["admin","operator"]);const active=stages(db,b.id);if(active.length>=30)throw new ApiError(409,"O kanban permite até 30 etapas");const stamp=now(),s={...input,id:id(),board_id:b.id,organization_id:b.organization_id,position:active.length,deleted_at:null,created_at:stamp,updated_at:stamp};db.prospectingStages.push(s);audit(db,b.organization_id,user.id,"prospecting_stage_created",{board_id:b.id,stage_id:s.id});return s;});
 });
 app.patch(root+"/stages/:id",async request=>{
  const user=await currentUser(request),input=stageEdit.parse(request.body),stageId=param(request);
  return store.mutate(db=>{const s=db.prospectingStages.find(x=>x.id===stageId&&!x.deleted_at);if(!s)throw new ApiError(404,"Etapa não encontrada");const b=board(db,s.board_id);membership(user.id,b.organization_id,["admin","operator"]);const ordered=stages(db,b.id).filter(x=>x.id!==s.id),position=input.position??s.position;if(position>ordered.length)throw new ApiError(422,"Posição da etapa inválida");ordered.splice(position,0,s);s.name=input.name;ordered.forEach((x,i)=>{x.position=i;x.updated_at=now();});audit(db,b.organization_id,user.id,"prospecting_stage_updated",{board_id:b.id,stage_id:s.id,name:s.name,position:s.position});return s;});
 });
 app.delete(root+"/stages/:id",async request=>{
  const user=await currentUser(request),input=stageDelete.parse(request.body??{}),stageId=param(request);
  return store.mutate(db=>{const s=db.prospectingStages.find(x=>x.id===stageId&&!x.deleted_at);if(!s)throw new ApiError(404,"Etapa não encontrada");const b=board(db,s.board_id);membership(user.id,b.organization_id,["admin","operator"]);const cards=db.prospectingCards.filter(c=>c.stage_id===s.id&&!c.deleted_at);if(input.destination_stage_id===s.id)throw new ApiError(422,"Escolha outra etapa de destino");if(input.destination_stage_id)stage(db,input.destination_stage_id,b.id);if(cards.length&&!input.destination_stage_id)throw new ApiError(409,"Escolha uma etapa de destino para preservar as empresas");const stamp=now();for(const c of cards){c.stage_id=input.destination_stage_id!;c.updated_at=stamp;}s.deleted_at=stamp;s.updated_at=stamp;stages(db,b.id).forEach((x,i)=>{x.position=i;x.updated_at=stamp;});audit(db,b.organization_id,user.id,"prospecting_stage_deleted",{board_id:b.id,stage_id:s.id,moved_count:cards.length,destination_stage_id:input.destination_stage_id??null});return {ok:true,moved_count:cards.length};});
 });
 app.post(root+"/cards",async request=>{
  const user=await currentUser(request),input=cardInput.parse(request.body);
  return store.mutate(db=>{const b=board(db,input.board_id);membership(user.id,b.organization_id,["admin","operator"]);stage(db,input.stage_id,b.id);const result=db.prospectingResults.find(r=>r.id===input.result_id);if(!result)throw new ApiError(404,"Empresa da pesquisa não encontrada");if(result.organization_id!==b.organization_id)throw new ApiError(403,"Empresa de outra organização");if(db.prospectingCards.some(c=>c.board_id===b.id&&c.company_key===result.company_key&&!c.deleted_at))throw new ApiError(409,"Esta empresa já está neste kanban");const stamp=now(),c={...input,id:id(),organization_id:b.organization_id,company_key:result.company_key,created_by:user.id,deleted_at:null,created_at:stamp,updated_at:stamp};db.prospectingCards.push(c);audit(db,b.organization_id,user.id,"prospecting_card_added",{board_id:b.id,stage_id:c.stage_id,card_id:c.id,result_id:result.id});return c;});
 });
 app.patch(root+"/cards/:id",async request=>{
  const user=await currentUser(request),input=cardMove.parse(request.body),cardId=param(request);
  return store.mutate(db=>{const c=db.prospectingCards.find(x=>x.id===cardId&&!x.deleted_at);if(!c)throw new ApiError(404,"Empresa não encontrada no kanban");const b=board(db,c.board_id);membership(user.id,b.organization_id,["admin","operator"]);stage(db,input.stage_id,b.id);if(c.stage_id!==input.expected_stage_id)throw new ApiError(409,"Esta empresa foi movida por outra pessoa. Atualize e tente novamente.");if(c.stage_id===input.stage_id)return c;const previous=c.stage_id;c.stage_id=input.stage_id;c.updated_at=now();audit(db,b.organization_id,user.id,"prospecting_card_moved",{board_id:b.id,card_id:c.id,from_stage_id:previous,to_stage_id:c.stage_id});return c;});
 });
 app.delete(root+"/cards/:id",async request=>{
  const user=await currentUser(request),cardId=param(request);
  return store.mutate(db=>{const c=db.prospectingCards.find(x=>x.id===cardId&&!x.deleted_at);if(!c)throw new ApiError(404,"Empresa não encontrada no kanban");const b=board(db,c.board_id);membership(user.id,b.organization_id,["admin","operator"]);c.deleted_at=now();c.updated_at=c.deleted_at;audit(db,b.organization_id,user.id,"prospecting_card_removed",{board_id:b.id,card_id:c.id});return {ok:true};});
 });
}
