import { afterEach, describe, expect, it, vi } from "vitest";
import { analysisUsage, analyzeAdvanced, interpretAnalysis, safeSource, summarizeAnalysis } from "../src/integrations/advanced-analyzer.js";
import { operationSchema } from "../src/operation-schema.js";
import { config } from "../src/config.js";
import type { IntegrationSettings, SearchCandidate } from "../src/types.js";
const company:SearchCandidate={name:"Empresa Teste",city:"Mossoró",category:"Teste",phone:"+55 (84) 99999-0000",address:"Rua Central, 100, Mossoró",website:null,maps_url:null,email:null,other_phones:[],social_links:[],source_id:null,raw_data:{}};
const data={decision:"eligible",reason:"Identidade confirmada e nenhum site próprio localizado.",confidence:95,identity_source:"https://maps.example/empresa",matched_phone:"84999990000",matched_address:"",websites:[] as {url:string;kind:string;evidence:string}[]};
function response(change:Partial<typeof data>={}){return {model:"gpt-6.1-sol",status:"completed",usage:{input_tokens:5000,output_tokens:1000},output:[{type:"web_search_call",status:"completed",action:{type:"search",sources:[{url:"https://maps.example/empresa"},{url:"https://empresa.example"}]}},{type:"message",content:[{type:"output_text",text:JSON.stringify({...data,...change})}]}]};}
const parse=(body:Record<string,unknown>,candidate=company)=>interpretAnalysis(body,candidate,"gpt-6.1-sol",analysisUsage(body,"gpt-6.1-sol"));
describe("análise avançada",()=>{
 it("exige pesquisa e identidade confirmada para liberar geração",()=>{expect(parse(response()).decision).toBe("eligible");expect(parse(response({matched_phone:"11988887777"})).decision).toBe("analysis_inconclusive");expect(parse(response({confidence:79})).decision).toBe("analysis_inconclusive");});
 it("não libera sem busca concluída/fontes",()=>{const b=response();b.output=b.output.filter(x=>x.type!=="web_search_call");expect(parse(b).decision).toBe("analysis_inconclusive");expect(parse({...response(),status:"incomplete"}).decision).toBe("analysis_inconclusive");});
 it("identifica site oficial consultado e não gera outro",()=>{expect(parse(response({decision:"has_website",websites:[{url:"https://empresa.example",kind:"official",evidence:"Telefone e empresa correspondem"}]})).decision).toBe("discarded_site_real");});
 it("não aceita site oficial inventado sem fonte",()=>{expect(parse(response({websites:[{url:"https://inventado.example",kind:"official",evidence:"Nome parecido"}]})).decision).toBe("analysis_inconclusive");});
 it("não ignora site já informado pelo Maps",()=>{expect(parse(response(),{...company,website:"https://existente.example"}).decision).toBe("analysis_inconclusive");});
 it("mantém dúvidas e JSON inválido sem gerar",()=>{expect(parse(response({decision:"inconclusive"})).decision).toBe("analysis_inconclusive");expect(parse({...response(),output_text:"resposta inválida"}).decision).toBe("analysis_inconclusive");});
 it("confere endereço com número quando telefone não bate",()=>{expect(parse(response({matched_phone:"",matched_address:"Rua Central, 100"})).decision).toBe("eligible");expect(parse(response({matched_phone:"",matched_address:"Rua Central"})).decision).toBe("analysis_inconclusive");expect(parse(response({matched_phone:"",matched_address:"Rua Central, 10"})).decision).toBe("analysis_inconclusive");});
 it("recusa URLs executáveis/credenciais",()=>{expect(safeSource("javascript:alert(1)")).toBeNull();expect(safeSource("https://user:pass@site.example")).toBeNull();});
 it("contabiliza chamadas web junto dos tokens, sem duplicar",()=>{const b=response(),u=analysisUsage(b,"gpt-6.1-sol");expect(u).toMatchObject({web_search_calls:1,search_cost_usd:0.01,estimated_cost_usd:0.03});const report=parse(b);expect(summarizeAnalysis([{advanced_analysis:report}])).toMatchObject({analyzed:1,total_tokens:6000,estimated_cost_usd:0.03});});
});
describe("contrato da operação",()=>{
 const input={organization_id:"11111111-1111-4111-8111-111111111111",niche:"Teste",city:"Mossoró",target_count:1,approval_mode:"human_review",message_template:"Texto"};
 it("mantém clientes antigos no modo padrão",()=>{expect(operationSchema.parse(input)).toMatchObject({analysis_mode:"standard",analysis_model:null});});
 it("define Sol como padrão avançado e aceita só os três modelos",()=>{expect(operationSchema.parse({...input,analysis_mode:"advanced"})).toMatchObject({analysis_model:"gpt-6.1-sol"});for(const m of ["gpt-6-luna","gpt-6.1-sol","gpt-6-astra"])expect(operationSchema.parse({...input,analysis_mode:"advanced",analysis_model:m}).analysis_model).toBe(m);expect(operationSchema.safeParse({...input,analysis_model:"model-inventado"}).success).toBe(false);});
});
describe("chamada externa",()=>{
 const original=config.mode;afterEach(()=>{config.mode=original;vi.unstubAllGlobals();});
 it("envia modelo, busca limitada e registra gasto antes de tratar JSON inválido",async()=>{
  config.mode="real";const body={...response(),output_text:"JSON inválido"},fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body)));vi.stubGlobal("fetch",fetcher);const onUsage=vi.fn(async()=>{});
  const r=await analyzeAdvanced(company,{openai_api_key:"fixture-key"} as IntegrationSettings,"gpt-6-astra",onUsage);
  expect(r.decision).toBe("analysis_inconclusive");expect(onUsage).toHaveBeenCalledOnce();const sent=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));expect(sent).toMatchObject({model:"gpt-6-astra",max_tool_calls:3,store:false,tools:[{type:"web_search"}]});
 });
 it("não libera ao receber erro do provedor e não expõe seu corpo",async()=>{config.mode="real";vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("credencial privada",{status:401})));const r=await analyzeAdvanced(company,{openai_api_key:"fixture-key"} as IntegrationSettings,"gpt-6-luna");expect(r.decision).toBe("analysis_inconclusive");expect(r.reason).not.toContain("privada");});
});
