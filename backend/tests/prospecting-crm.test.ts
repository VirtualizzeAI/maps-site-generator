import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import Fastify from "fastify";
import {z} from "zod";
import type {Database} from "../src/types.js";
const fixture=vi.hoisted(()=>({db:{} as Database,queue:Promise.resolve() as Promise<unknown>}));
vi.mock("../src/store.js",()=>({store:{snapshot:()=>structuredClone(fixture.db),reload:async()=>{},mutate:(fn:(db:Database)=>unknown)=>{const p=fixture.queue.catch(()=>undefined).then(async()=>{const copy=structuredClone(fixture.db);const result=await fn(copy);fixture.db=copy;return result;});fixture.queue=p;return p;}}}));
vi.mock("../src/supabase.js",()=>({authClient:()=>({auth:{getClaims:async(token:string)=>["admin","operator","viewer","foreign"].includes(token)?{data:{claims:{sub:token}},error:null}:{data:null,error:new Error("invalid")}}})}));
import {registerProspectingCrmRoutes} from "../src/prospecting-crm-routes.js";
const org="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222",result="33333333-3333-4333-8333-333333333333",duplicate="44444444-4444-4444-8444-444444444444",foreignResult="55555555-5555-4555-8555-555555555555";
const root="/api/v1/prospecting/crm";let app:ReturnType<typeof Fastify>;
beforeEach(()=>{
 fixture.queue=Promise.resolve();fixture.db={organizations:[],users:["admin","operator","viewer","foreign"].map(id=>({id,active:true})),memberships:["admin","operator","viewer"].map(role=>({user_id:role,organization_id:org,role})).concat([{user_id:"foreign",organization_id:other,role:"admin"}]),integrations:[],operations:[],companies:[],operationCompanies:[],messages:[],events:[],prospectingOperations:[{id:"op",organization_id:org,collect_linkedin:true,collect_contacts:true}],prospectingResults:[{id:result,organization_id:org,operation_id:"op",company_key:"empresa:teste",name:"Empresa",report:{summary:"Análise pública",sources:["https://example.com"]}},{id:duplicate,organization_id:org,operation_id:"op",company_key:"empresa:teste",name:"Empresa"},{id:foreignResult,organization_id:other,operation_id:"other-op",company_key:"outra:teste",name:"Outra"}],prospectingBoards:[],prospectingStages:[],prospectingCards:[]} as unknown as Database;
 app=Fastify();app.setErrorHandler((error,_request,reply)=>reply.status(error instanceof z.ZodError?422:((error as {statusCode?:number}).statusCode||500)).send({detail:error.message}));registerProspectingCrmRoutes(app);
});
afterEach(async()=>{await app.close();});
async function call(method:"GET"|"POST"|"PATCH"|"DELETE",path:string,payload?:Record<string,unknown>,role="operator") {return app.inject({method,url:root+path,headers:role?{authorization:`Bearer ${role}`}:{},...(payload?{payload}:{})});}
async function create(role="operator",oid=org){const r=await call("POST","/boards",{organization_id:oid,name:"Comercial"},role);expect(r.statusCode).toBe(200);return r.json();}
async function add(b:Awaited<ReturnType<typeof create>>,rid=result){return call("POST","/cards",{board_id:b.id,stage_id:b.stages[0].id,result_id:rid});}
describe("CRM da prospecção web",()=>{
 it("cria, renomeia e lista kanbans com etapas e auditoria, sem disparar operações",async()=>{
  const b=await create();expect(b.stages.map((s:{position:number})=>s.position)).toEqual([0,1,2,3]);expect((await call("PATCH",`/boards/${b.id}`,{name:"  Equipe vendas  "})).json().name).toBe("Equipe vendas");const list=await call("GET",`/boards?organization_id=${org}`,undefined,"viewer");expect(list.json()[0]).toMatchObject({name:"Equipe vendas",card_count:0});expect(fixture.db.events.map(e=>e.event_type)).toEqual(["prospecting_board_created","prospecting_board_updated"]);expect(fixture.db.operations).toEqual([]);expect(fixture.db.messages).toEqual([]);
 });
 it("permite criar, renomear e reordenar etapas mantendo posições contíguas",async()=>{
  const b=await create(),s=(await call("POST",`/boards/${b.id}/stages`,{name:"Retorno"})).json();expect(s.position).toBe(4);expect((await call("PATCH",`/stages/${s.id}`,{name:"Retornar depois",position:1})).statusCode).toBe(200);const detail=(await call("GET",`/boards/${b.id}`)).json();expect(detail.stages.map((x:{position:number})=>x.position)).toEqual([0,1,2,3,4]);expect(detail.stages[1].name).toBe("Retornar depois");expect((await call("PATCH",`/stages/${s.id}`,{name:"Inválida",position:9})).statusCode).toBe(422);
 });
 it("mantém análise e pesquisa de origem acessíveis no cartão e aceita leitura pelo visualizador",async()=>{
  const b=await create(),c=(await add(b)).json();const d=(await call("GET",`/boards/${b.id}`,undefined,"viewer")).json();expect(d.cards[0]).toMatchObject({id:c.id,result:{id:result,report:{summary:"Análise pública"}},operation:{id:"op",collect_linkedin:true}});expect(d.card_count).toBe(1);expect(d.stages[0].card_count).toBe(1);
 });
 it("bloqueia duplicidade no mesmo kanban inclusive de outra pesquisa e pedidos simultâneos",async()=>{
  const b=await create();const responses=await Promise.all([add(b),add(b,duplicate)]);expect(responses.map(r=>r.statusCode).sort()).toEqual([200,409]);expect(fixture.db.prospectingCards).toHaveLength(1);const otherBoard=await create();expect((await add(otherBoard,duplicate)).statusCode).toBe(200);
 });
 it("move empresas e detecta edição concorrente sem sobrescrever o movimento",async()=>{
  const b=await create(),c=(await add(b)).json();const responses=await Promise.all([call("PATCH",`/cards/${c.id}`,{stage_id:b.stages[1].id,expected_stage_id:b.stages[0].id}),call("PATCH",`/cards/${c.id}`,{stage_id:b.stages[2].id,expected_stage_id:b.stages[0].id})]);expect(responses.map(r=>r.statusCode)).toEqual([200,409]);expect(fixture.db.prospectingCards[0]?.stage_id).toBe(b.stages[1].id);expect(fixture.db.events.filter(e=>e.event_type==="prospecting_card_moved")).toHaveLength(1);
 });
 it("recusa etapa de outro kanban na inclusão, movimento e exclusão com transferência",async()=>{
  const b=await create(),second=await create(),c=(await add(b)).json();expect((await call("POST","/cards",{board_id:b.id,stage_id:second.stages[0].id,result_id:duplicate})).statusCode).toBe(409);expect((await call("PATCH",`/cards/${c.id}`,{stage_id:second.stages[0].id,expected_stage_id:b.stages[0].id})).statusCode).toBe(409);expect((await call("DELETE",`/stages/${b.stages[0].id}`,{destination_stage_id:second.stages[0].id})).statusCode).toBe(409);expect(fixture.db.prospectingCards[0]?.stage_id).toBe(b.stages[0].id);
 });
 it("exige destino na exclusão de etapa ocupada e transfere empresas atomicamente",async()=>{
  const b=await create();await add(b);expect((await call("DELETE",`/stages/${b.stages[0].id}`,{})).statusCode).toBe(409);expect((await call("DELETE",`/stages/${b.stages[0].id}`,{destination_stage_id:b.stages[0].id})).statusCode).toBe(422);const r=await call("DELETE",`/stages/${b.stages[0].id}`,{destination_stage_id:b.stages[1].id});expect(r.json()).toMatchObject({ok:true,moved_count:1});expect(fixture.db.prospectingCards[0]?.stage_id).toBe(b.stages[1].id);const d=(await call("GET",`/boards/${b.id}`)).json();expect(d.stages.map((s:{position:number})=>s.position)).toEqual([0,1,2]);expect(d.cards).toHaveLength(1);expect((await call("POST","/cards",{board_id:b.id,stage_id:b.stages[0].id,result_id:duplicate})).statusCode).toBe(409);
 });
 it("exclui etapas vazias, remove cartões e permite adicionar novamente preservando pesquisas",async()=>{
  const b=await create(),c=(await add(b)).json();expect((await call("DELETE",`/cards/${c.id}`)).statusCode).toBe(200);expect((await add(b)).statusCode).toBe(200);expect(fixture.db.prospectingResults).toHaveLength(3);expect(fixture.db.prospectingCards.find(x=>x.id===c.id)?.deleted_at).toBeTruthy();expect((await call("DELETE",`/stages/${b.stages[3].id}`,{})).statusCode).toBe(200);
 });
 it("excluir kanban oculta seu conteúdo e bloqueia novas alterações sem apagar pesquisas",async()=>{
  const b=await create(),c=(await add(b)).json();expect((await call("DELETE",`/boards/${b.id}`)).statusCode).toBe(200);expect((await call("GET",`/boards?organization_id=${org}`)).json()).toEqual([]);expect((await call("GET",`/boards/${b.id}`)).statusCode).toBe(404);expect((await call("PATCH",`/cards/${c.id}`,{stage_id:b.stages[1].id,expected_stage_id:b.stages[0].id})).statusCode).toBe(404);expect((await add(b)).statusCode).toBe(404);expect(fixture.db.prospectingResults).toHaveLength(3);expect(fixture.db.prospectingCards).toHaveLength(1);
 });
 it("exige autenticação e impede qualquer alteração por visualizadores",async()=>{
  const b=await create(),c=(await add(b)).json();expect((await call("GET",`/boards?organization_id=${org}`,undefined,"")).statusCode).toBe(401);
  const actions:["POST"|"PATCH"|"DELETE",string,Record<string,unknown>?][]=[["POST","/boards",{organization_id:org,name:"Teste"}],["PATCH",`/boards/${b.id}`,{name:"Teste"}],["DELETE",`/boards/${b.id}`],["POST",`/boards/${b.id}/stages`,{name:"Nova"}],["PATCH",`/stages/${b.stages[0].id}`,{name:"Nova"}],["DELETE",`/stages/${b.stages[0].id}`,{}],["POST","/cards",{board_id:b.id,stage_id:b.stages[0].id,result_id:duplicate}],["PATCH",`/cards/${c.id}`,{stage_id:b.stages[1].id,expected_stage_id:b.stages[0].id}],["DELETE",`/cards/${c.id}`]];
  for(const [method,path,payload] of actions)expect((await call(method,path,payload,"viewer")).statusCode).toBe(403);
 });
 it("isola organizações nos kanbans, etapas, cartões e pesquisa de origem",async()=>{
  const b=await create(),c=(await add(b)).json();for(const [method,path,payload] of [["GET",`/boards/${b.id}`],["PATCH",`/boards/${b.id}`,{name:"Alterado"}],["DELETE",`/boards/${b.id}`],["POST",`/boards/${b.id}/stages`,{name:"Nova"}],["PATCH",`/stages/${b.stages[0].id}`,{name:"Alterada"}],["DELETE",`/stages/${b.stages[0].id}`,{}],["PATCH",`/cards/${c.id}`,{stage_id:b.stages[1].id,expected_stage_id:b.stages[0].id}],["DELETE",`/cards/${c.id}`]] as const)expect((await call(method,path,payload,"foreign")).statusCode).toBe(403);
  expect((await call("GET",`/boards?organization_id=${other}`)).statusCode).toBe(403);expect((await add(b,foreignResult)).statusCode).toBe(403);
 });
 it("valida nomes, UUIDs e campos de entrada sem permitir trocar organização ou referência",async()=>{
  expect((await call("POST","/boards",{organization_id:org,name:"  "})).statusCode).toBe(422);const b=await create();expect((await call("PATCH",`/boards/${b.id}`,{name:"Nome",organization_id:other})).statusCode).toBe(422);expect((await call("GET","/boards/not-uuid")).statusCode).toBe(422);expect((await call("POST","/cards",{board_id:b.id,stage_id:b.stages[0].id,result_id:result,company_key:"forjado"})).statusCode).toBe(422);
 });
});
