import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, IntegrationSettings, Operation, SearchCandidate } from "../src/types.js";

const fixture = vi.hoisted(() => ({db: {} as Database,queue:Promise.resolve() as Promise<unknown>,nextId:0,sendTimes:[] as number[]}));
vi.mock("../src/store.js",()=>({store:{
  snapshot:()=>structuredClone(fixture.db),
  mutate:(fn:(db:Database)=>unknown)=>{
    const work=fixture.queue.catch(()=>undefined).then(async()=>{
      const next=structuredClone(fixture.db),result=await fn(next);fixture.db=next;return result;
    });fixture.queue=work;return work;
  },
}}));
vi.mock("../src/auth.js",()=>({id:()=>`fixture-${++fixture.nextId}`,now:()=>new Date(Date.now()).toISOString(),ApiError:class extends Error{constructor(public statusCode:number,message:string){super(message);}}}));
vi.mock("../src/integrations/search.js",()=>({searchCompanies:vi.fn()}));
vi.mock("../src/integrations/analyzer.js",()=>({analyzePresence:vi.fn(async()=>({decision:"eligible",score:10,evidence:{},discovered:{emails:[],phones:[],socialLinks:[]}}))}));
vi.mock("../src/integrations/advanced-analyzer.js",()=>({analyzeAdvanced:vi.fn()}));
vi.mock("../src/integrations/site.js",()=>({createSite:vi.fn()}));
vi.mock("../src/integrations/whatsapp.js",()=>({sendWhatsApp:vi.fn(async(recipient:string)=>{
  fixture.sendTimes.push(Date.now());return {providerMessageId:`mock-${fixture.sendTimes.length}`,originalRecipient:recipient,actualRecipient:recipient,redirected:false};
})}));

import { queueSiteAction } from "../src/site-actions.js";
import { processManualSiteAction, processOperation } from "../src/pipeline.js";
import { store } from "../src/store.js";
import { searchCompanies } from "../src/integrations/search.js";
import { analyzeAdvanced } from "../src/integrations/advanced-analyzer.js";
import { createSite } from "../src/integrations/site.js";
import { siteUsage } from "../src/site-usage.js";

const started = Date.parse("2026-10-23T12:00:00.000Z");
const candidates: SearchCandidate[] = [1,2].map(n=>({name:`Empresa ${n}`,category:"Teste",city:"Mossoró",address:null,phone:`558499999000${n}`,other_phones:[],email:null,website:null,maps_url:null,social_links:[],source_id:`source-${n}`,raw_data:{}}));
beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(started);vi.clearAllMocks();fixture.nextId=0;fixture.sendTimes=[];fixture.queue=Promise.resolve();
  const operation:Operation={id:"operation",organization_id:"org",created_by:"admin",niche:"Teste",city:"Mossoró",target_count:2,approval_mode:"automatic",message_template:"Olá {{empresa}}: {{link}}",status:"queued",scheduled_for:null,started_at:null,finished_at:null,error_message:null,found_count:0,analyzed_count:0,generated_count:0,sent_count:0,discarded_count:0,blocked_count:0,current_company_id:null,current_company_name:null,current_stage:null,archived_at:null,archived_by:null,created_at:new Date(started).toISOString(),updated_at:new Date(started).toISOString()};
  const integration:IntegrationSettings={organization_id:"org",serper_api_key:"",openai_api_key:"",openai_model:"test",site_generation_prompt:"",automatic_send_interval_seconds:2,vercel_token:"",evolution_url:"",evolution_api_key:"",evolution_instance:"",whatsapp_test_mode:false,whatsapp_test_number:"",updated_at:new Date(started).toISOString()};
  fixture.db={prospectingOperations:[],prospectingResults:[],organizations:[],users:[],memberships:[],integrations:[integration],operations:[operation],companies:[],operationCompanies:[],messages:[],events:[]};
  vi.mocked(searchCompanies).mockResolvedValue(candidates);
  vi.mocked(createSite).mockImplementation(async candidate=>({url:`https://example.com/${candidate.source_id}`,deploymentId:null,slug:candidate.source_id!}));
});
afterEach(()=>vi.useRealTimers());

describe("intervalo no processamento das operações",()=>{
  async function readyManual(){
    fixture.db.operations[0]!.analysis_mode="advanced";
    vi.mocked(analyzeAdvanced).mockResolvedValue({model:"gpt-6.1-sol",decision:"analysis_inconclusive",reason:"Conferir",confidence:50,sources:[],websites:[],usage:null,checked_at:new Date().toISOString()});
    await processOperation("operation");return fixture.db.operationCompanies[0]!.id;
  }
  it("cria somente site, sem mensagem, e depois aborda sem nova geração",async()=>{
    const linkId=await readyManual();fixture.db.operations[0]!.approval_mode="human_review";
    await store.mutate(db=>queueSiteAction(db,linkId,"site_only","admin","event",new Date().toISOString()));
    await processManualSiteAction(linkId);expect(fixture.db.operationCompanies[0]!.status).toBe("site_created");expect(fixture.db.messages).toHaveLength(0);expect(fixture.sendTimes).toHaveLength(0);expect(createSite).toHaveBeenCalledTimes(1);
    await store.mutate(db=>queueSiteAction(db,linkId,"site_and_outreach","admin","event2",new Date().toISOString()));
    await processManualSiteAction(linkId);expect(createSite).toHaveBeenCalledTimes(1);expect(fixture.db.operations[0]!.generated_count).toBe(1);expect(fixture.db.messages[0]?.status).toBe("pending_approval");expect(fixture.sendTimes).toHaveLength(0);
    await processManualSiteAction(linkId);expect(fixture.db.messages).toHaveLength(1);
  });
  it("criar e abordar respeita envio automático",async()=>{
    const linkId=await readyManual();await store.mutate(db=>queueSiteAction(db,linkId,"site_and_outreach","admin","event",new Date().toISOString()));await processManualSiteAction(linkId);expect(fixture.sendTimes).toHaveLength(1);expect(fixture.db.operationCompanies[0]!.status).toBe("sent");
  });
  it("preserva o site publicado quando o envio falha",async()=>{
    const linkId=await readyManual();const {sendWhatsApp}=await import("../src/integrations/whatsapp.js");vi.mocked(sendWhatsApp).mockRejectedValueOnce(new Error("Falha externa"));
    await store.mutate(db=>queueSiteAction(db,linkId,"site_and_outreach","admin","event",new Date().toISOString()));await processManualSiteAction(linkId);expect(fixture.db.operationCompanies[0]).toMatchObject({status:"failed",generated_site_url:expect.stringContaining("https://")});expect(fixture.db.operations[0]!.generated_count).toBe(1);expect(fixture.db.messages).toHaveLength(0);
  });

  it("modo avançado inconclusivo não gera nem envia e salva evidências",async()=>{
    fixture.db.operations[0]!.analysis_mode="advanced";
    vi.mocked(analyzeAdvanced).mockResolvedValue({model:"gpt-6.1-sol",decision:"analysis_inconclusive",reason:"Homônimas",confidence:50,sources:[],websites:[],usage:null,checked_at:new Date().toISOString()});
    await processOperation("operation");
    expect(createSite).not.toHaveBeenCalled();expect(fixture.sendTimes).toHaveLength(0);
    expect(fixture.db.operationCompanies.every(c=>c.status==="analysis_inconclusive"&&c.advanced_analysis?.reason==="Homônimas")).toBe(true);
  });
  it("modo avançado elegível usa o modelo selecionado e aguarda ação por empresa",async()=>{
    fixture.db.operations[0]!.analysis_mode="advanced";fixture.db.operations[0]!.analysis_model="gpt-6-luna";fixture.db.operations[0]!.approval_mode="human_review";
    vi.mocked(analyzeAdvanced).mockResolvedValue({model:"gpt-6-luna",decision:"eligible",reason:"Sem site",confidence:95,sources:[],websites:[],usage:null,checked_at:new Date().toISOString()});
    await processOperation("operation");expect(vi.mocked(analyzeAdvanced).mock.calls[0]?.[2]).toBe("gpt-6-luna");expect(createSite).not.toHaveBeenCalled();expect(fixture.db.operationCompanies.every(c=>c.status==="analysis_ready")).toBe(true);expect(fixture.db.messages).toHaveLength(0);expect(fixture.sendTimes).toHaveLength(0);
  });
  it("site próprio encontrado no avançado impede geração e envio",async()=>{
    fixture.db.operations[0]!.analysis_mode="advanced";
    vi.mocked(analyzeAdvanced).mockResolvedValue({model:"gpt-6.1-sol",decision:"discarded_site_real",reason:"Site próprio",confidence:95,sources:[],websites:[],usage:null,checked_at:new Date().toISOString()});
    await processOperation("operation");expect(createSite).not.toHaveBeenCalled();expect(fixture.sendTimes).toHaveLength(0);expect(fixture.db.operations[0]!.discarded_count).toBe(2);
  });
  it("preserva uso pago quando a publicação falha e não envia mensagens",async()=>{
    vi.mocked(createSite).mockImplementation(async (_candidate,_settings,onUsage)=>{
      await onUsage?.(siteUsage({usage:{input_tokens:1000,output_tokens:500}},"gpt-6-sol"));
      throw new Error("Publicação indisponível");
    });
    await processOperation("operation");
    expect(fixture.db.operationCompanies).toHaveLength(2);
    expect(fixture.db.operationCompanies.every(item=>item.status==="failed"&&item.site_generation_usage?.estimated_cost_usd===0.007)).toBe(true);
    expect(fixture.db.events.filter(item=>item.event_type==="site_generation_usage_recorded")).toHaveLength(2);
    expect(fixture.sendTimes).toHaveLength(0);
  });
  it("aguarda entre envios e não adiciona espera após o último",async()=>{
    const work=processOperation("operation");await vi.advanceTimersByTimeAsync(0);
    expect(fixture.sendTimes).toEqual([started]);
    expect(fixture.db.operations[0]?.current_stage).toContain("Aguardando intervalo");
    await vi.advanceTimersByTimeAsync(1999);expect(fixture.sendTimes).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);await work;
    expect(fixture.sendTimes).toEqual([started,started+2000]);
    expect(analyzeAdvanced).not.toHaveBeenCalled();
    expect(fixture.db.operations[0]?.status).toBe("completed");expect(vi.getTimerCount()).toBe(0);
  });
  it("contabiliza o tempo de criação do próximo site",async()=>{
    vi.mocked(createSite).mockImplementation(async candidate=>{
      if(candidate.source_id==="source-2")await new Promise(resolve=>setTimeout(resolve,3000));
      return {url:"https://example.com/site",deploymentId:null,slug:"test"};
    });
    const work=processOperation("operation");await vi.advanceTimersByTimeAsync(3000);await work;
    expect(fixture.sendTimes).toEqual([started,started+3000]);
  });
  it("permite salvar configurações durante a espera e reavalia o intervalo",async()=>{
    fixture.db.integrations[0]!.automatic_send_interval_seconds=60;
    const work=processOperation("operation");await vi.advanceTimersByTimeAsync(0);
    expect(fixture.sendTimes).toHaveLength(1);
    await store.mutate(db=>{db.integrations[0]!.automatic_send_interval_seconds=0;});
    await vi.advanceTimersByTimeAsync(1000);await work;
    expect(fixture.sendTimes).toEqual([started,started+1000]);
  });
  it("aprovação humana não entra na espera nem envia automaticamente",async()=>{
    fixture.db.operations[0]!.approval_mode="human_review";
    await processOperation("operation");
    expect(fixture.sendTimes).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);
    expect(fixture.db.messages.map(item=>item.status)).toEqual(["pending_approval","pending_approval"]);
  });
});
