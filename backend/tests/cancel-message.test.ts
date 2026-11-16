import { describe, expect, it } from "vitest";
import { cancelPendingMessage } from "../src/cancel-message.js";
import type { Database } from "../src/types.js";
const fixture = () => ({messages:[{id:"m",organization_id:"org",operation_company_id:"link",status:"pending_approval",content:"Texto",sent_at:null}],operationCompanies:[{id:"link",operation_id:"op",company_id:"company",generated_site_url:"https://site.example"}],operations:[{id:"op",status:"awaiting_approval",discarded_count:0,sent_count:0,archived_at:null}],companies:[{id:"company",archived_at:null,prospected_at:null}],events:[]} as unknown as Database);
const cancel = (db:Database) => cancelPendingMessage(db,"m","operator","event","2026-11-16T12:00:00.000Z");
describe("cancelamento de pendências",()=>{
 it("preserva mensagem/site e conclui a última pendência sem marcar envio",()=>{
  const db=fixture();cancel(db);
  expect(db.messages[0]).toMatchObject({status:"cancelled",content:"Texto",sent_at:null});
  expect(db.operationCompanies[0]).toMatchObject({status:"cancelled",generated_site_url:"https://site.example"});
  expect(db.operations[0]).toMatchObject({status:"completed",discarded_count:1,sent_count:0});
  expect(db.companies[0]?.prospected_at).toBeNull();
  expect(db.events[0]).toMatchObject({actor_id:"operator",event_type:"message_cancelled"});
  expect(()=>cancel(db)).toThrow("aguardando aprovação");expect(db.events).toHaveLength(1);
 });
 it("mantém operação aguardando outras aprovações",()=>{
  const db=fixture();db.messages.push({...db.messages[0]!,id:"other"});cancel(db);expect(db.operations[0]?.status).toBe("awaiting_approval");
 });
 it("não encerra operação ainda processando empresas",()=>{
  const db=fixture();db.operations[0]!.status="analyzing";cancel(db);expect(db.operations[0]?.status).toBe("analyzing");
 });
 it("recusa enviados/em envio/falhas/cancelados sem alterar histórico",()=>{
  for(const status of ["sent","sending","failed","cancelled"]){const db=fixture();db.messages[0]!.status=status;expect(()=>cancel(db)).toThrow("aguardando aprovação");expect(db.events).toHaveLength(0);}
 });
 it("recusa registros ausentes ou arquivados",()=>{
  for(const kind of ["company","operation","missing"]){const db=fixture();if(kind==="company")db.companies[0]!.archived_at="date";else if(kind==="operation")db.operations[0]!.archived_at="date";else db.messages=[];expect(()=>cancel(db)).toThrow("não encontrada");expect(db.events).toHaveLength(0);}
 });
});
