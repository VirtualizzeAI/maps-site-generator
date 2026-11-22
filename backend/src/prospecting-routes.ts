import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {ApiError,currentUser,membership,id,now} from "./auth.js";
import {store} from "./store.js";
import {prospectingSchema} from "./prospecting-schema.js";
import {prospectingTotals} from "./prospecting-worker.js";
import type {ProspectingOperation} from "./prospecting-types.js";
const descending=(a:{created_at:string},b:{created_at:string})=>b.created_at.localeCompare(a.created_at);
function queryString(query:unknown,key:string){const data=z.record(z.string(),z.unknown()).parse(query);return z.string().min(1).parse(data[key]);}
export function registerProspectingRoutes(app:FastifyInstance){
app.post("/api/v1/prospecting/operations",async request=>{
 const user=await currentUser(request),input=prospectingSchema.parse(request.body);
 membership(user.id,input.organization_id,["admin","operator"]);
 const operation:ProspectingOperation={...input,id:id(),created_by:user.id,status:"queued",found_count:0,analyzed_count:0,duplicate_count:0,current_company:null,error_message:null,discovery_usage:null,created_at:now(),updated_at:now(),started_at:null,finished_at:null};
 await store.mutate(db=>{db.prospectingOperations.push(operation);db.events.push({id:id(),organization_id:operation.organization_id,operation_id:null,operation_company_id:null,actor_id:user.id,event_type:"prospecting_created",payload:{prospecting_operation_id:operation.id,collect_linkedin:operation.collect_linkedin,collect_contacts:operation.collect_contacts,model:operation.model},created_at:now()});});
 return operation;
});
app.get("/api/v1/prospecting/operations",async request=>{
 const user=await currentUser(request),org=queryString(request.query,"organization_id");membership(user.id,org);
 const db=store.snapshot();return db.prospectingOperations.filter(x=>x.organization_id===org).sort(descending).map(op=>({...op,totals:prospectingTotals(op,db.prospectingResults.filter(r=>r.operation_id===op.id))}));
});
app.get("/api/v1/prospecting/operations/:id",async request=>{
 const user=await currentUser(request),operationId=(request.params as {id:string}).id,db=store.snapshot(),op=db.prospectingOperations.find(x=>x.id===operationId);
 if(!op)throw new ApiError(404,"Operação de prospecção não encontrada");membership(user.id,op.organization_id);
 const results=db.prospectingResults.filter(r=>r.operation_id===op.id).sort((a,b)=>a.created_at.localeCompare(b.created_at));return {...op,results,totals:prospectingTotals(op,results)};
});

}
