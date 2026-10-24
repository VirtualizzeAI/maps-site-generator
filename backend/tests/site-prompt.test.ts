import { afterEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_SITE_GENERATION_PROMPT, siteGenerationInput } from "../src/site-prompt.js";
import { integrationPatchSchema } from "../src/admin-schemas.js";
import { createSite } from "../src/integrations/site.js";
import { config, sitesDir } from "../src/config.js";
import type { IntegrationSettings, SearchCandidate } from "../src/types.js";

const company: SearchCandidate = {
  name: "Empresa Teste", category: "Barbearia", city: "Mossoró",
  address: "Rua Teste, 10", phone: "5584999991234", other_phones: [],
  email: null, website: null, maps_url: null, social_links: [], source_id: null, raw_data: {},
};

describe("prompt configurável dos sites", () => {
  it("preserva o prompt padrão para organizações sem personalização", () => {
    expect(siteGenerationInput(company).instructions).toContain("Crie um site completo");
    expect(siteGenerationInput(company, " ")).toEqual(siteGenerationInput(company, DEFAULT_SITE_GENERATION_PROMPT));
  });

  it("aplica as variáveis e mantém valores literais sem expansão recursiva", () => {
    const result = siteGenerationInput({...company, name:"Empresa $& {{cidade}}"},
      "Site para {{empresa}} em {{ cidade }}; {{segmento}}, {{endereco}}, {{whatsapp}}. Repita {{empresa}}.");
    expect(result.instructions).toContain("Empresa $& {{cidade}} em Mossoró; Barbearia, Rua Teste, 10, 5584999991234");
    expect(result.instructions).toContain("Repita Empresa $& {{cidade}}.");
  });

  it("envia os dados da empresa mesmo sem variáveis e exige HTML completo", () => {
    const result = siteGenerationInput(company, "Prefira cores claras e uma seção de depoimentos.");
    expect(result.instructions).toContain("Prefira cores claras");
    expect(result.instructions).toContain("documento HTML completo");
    expect(result.input).toContain(company.name);
    expect(result.input).toContain(company.phone);
  });

  it("trata contatos ausentes sem inventar telefone", () => {
    const result = siteGenerationInput({...company, phone:null, address:null});
    expect(result.instructions).toContain("WhatsApp: Não informado");
    expect(result.instructions).not.toContain("null");
  });

  it("valida prompts vazios e o limite de tamanho na API", () => {
    expect(integrationPatchSchema.safeParse({site_generation_prompt:" "}).success).toBe(false);
    expect(integrationPatchSchema.safeParse({site_generation_prompt:"a".repeat(20001)}).success).toBe(false);
    expect(integrationPatchSchema.safeParse({site_generation_prompt:DEFAULT_SITE_GENERATION_PROMPT}).success).toBe(true);
  });
});

describe("integração do prompt com a geração", () => {
  const originalMode = config.mode;
  afterEach(() => { config.mode=originalMode; vi.unstubAllGlobals(); });

  it("registra tokens pagos antes de recusar HTML inválido", async () => {
    config.mode="real";
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({model:"gpt-6-sol",usage:{input_tokens:1000,output_tokens:500},output_text:"HTML inválido"})));
    vi.stubGlobal("fetch",fetcher);
    const recorded=vi.fn(async()=>{});
    await expect(createSite(company,{openai_api_key:"fixture",openai_model:"gpt-6-sol"} as IntegrationSettings,recorded)).rejects.toThrow("HTML válido");
    expect(recorded).toHaveBeenCalledWith(expect.objectContaining({total_tokens:1500,estimated_cost_usd:0.007}));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("usa o prompt salvo nas instruções da chamada OpenAI", async () => {
    config.mode="real";
    const settings: IntegrationSettings = {
      organization_id:"fixture",openai_api_key:"fixture-key",openai_model:"fixture-model",
      site_generation_prompt:"Crie um site de luxo para {{empresa}} com fundo bege e três seções.",
      automatic_send_interval_seconds:0,serper_api_key:"",vercel_token:"fixture-token",evolution_url:"",evolution_api_key:"",
      evolution_instance:"",whatsapp_test_mode:true,whatsapp_test_number:"",updated_at:"",
    };
    const fetcher=vi.fn<typeof fetch>().mockImplementation(async (url) => {
      if(url==="https://api.openai.com/v1/responses") return new Response(JSON.stringify({output_text:"<html><body>Site de teste</body></html>"}));
      if(url==="https://api.vercel.com/v13/deployments") return new Response(JSON.stringify({id:"dpl_fixture",projectId:"prj_fixture",readyState:"READY",url:"fixture.vercel.app",alias:["fixture.vercel.app"]}));
      if(String(url).startsWith("https://api.vercel.com/v9/projects/")) return new Response("{}");
      if(url==="https://fixture.vercel.app") return new Response("<html></html>");
      throw new Error("Requisição inesperada no teste");
    });
    vi.stubGlobal("fetch",fetcher);
    const recorded=vi.fn(async()=>{});
    const result=await createSite(company,settings,recorded);
    try {
      const request=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
      expect(request.instructions).toContain("site de luxo para Empresa Teste com fundo bege");
      expect(request.input).toContain(company.phone);
      expect(request.model).toBe("fixture-model");
      expect(recorded).toHaveBeenCalledWith(expect.objectContaining({model:"fixture-model",total_tokens:null,estimated_cost_usd:null}));
      expect(recorded.mock.invocationCallOrder[0]).toBeLessThan(fetcher.mock.invocationCallOrder[1]!);
    } finally { await rm(path.join(sitesDir,result.slug),{recursive:true,force:true}); }
  });
});
