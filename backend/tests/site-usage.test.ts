import { describe, expect, it } from "vitest";
import { mockSiteUsage, siteUsage, summarizeSiteUsage } from "../src/site-usage.js";

describe("consumo e custo da geração", () => {
  it("usa a resposta do provedor e não cobra cache/raciocínio duas vezes", () => {
    const result = siteUsage({id:"resp_test",model:"gpt-6-sol",usage:{input_tokens:1000,input_tokens_details:{cached_tokens:200,cache_write_tokens:300},output_tokens:500,output_tokens_details:{reasoning_tokens:400},total_tokens:1500}}, "other");
    expect(result).toMatchObject({model:"gpt-6-sol",response_id:"resp_test",total_tokens:1500,reasoning_tokens:400,estimated_cost_usd:0.00679});
    expect(result.pricing).toMatchObject({input:2,cached:0.2,write:2.5,output:10});
  });
  it("aplica tarifa de contexto longo ao pedido inteiro", () => {
    expect(siteUsage({usage:{input_tokens:272001,output_tokens:100}},"gpt-6-sol").estimated_cost_usd).toBe(1.089504);
  });
  it("reconhece snapshots e o preço específico do modelo", () => {
    expect(siteUsage({model:"gpt-5-mini-2025-08-07",usage:{input_tokens:1000,output_tokens:500}},"other").estimated_cost_usd).toBe(0.00125);
  });
  it("não inventa preços nem tokens ausentes", () => {
    expect(siteUsage({usage:{input_tokens:1000,output_tokens:500}},"unknown")).toMatchObject({total_tokens:1500,estimated_cost_usd:null,pricing:null});
    expect(siteUsage({},"gpt-6-sol")).toMatchObject({total_tokens:null,estimated_cost_usd:null});
    expect(siteUsage({service_tier:"priority",usage:{input_tokens:1000,output_tokens:500}},"gpt-6-sol").estimated_cost_usd).toBeNull();
  });
  it("recusa contagem inconsistente para estimar o custo", () => {
    for (const input_tokens of [-1,1.5,"1000",null]) expect(siteUsage({usage:{input_tokens,output_tokens:1}},"gpt-6-sol").estimated_cost_usd).toBeNull();
    expect(siteUsage({usage:{input_tokens:10,input_tokens_details:{cached_tokens:20},output_tokens:1}},"gpt-6-sol").estimated_cost_usd).toBeNull();
  });
  it("soma só valores registrados e informa cobertura incompleta", () => {
    const priced=siteUsage({usage:{input_tokens:1000,output_tokens:500}},"gpt-6-sol");
    const unknown=siteUsage({usage:{input_tokens:1000,output_tokens:500}},"unknown");
    expect(summarizeSiteUsage([{generated_site_url:"url",site_generation_usage:priced},{generated_site_url:null,site_generation_usage:unknown},{generated_site_url:"old"},{generated_site_url:null}])).toMatchObject({recorded_generations:2,total_tokens:3000,estimated_cost_usd:0.007,unpriced_generations:1,missing_usage:1});
    expect(summarizeSiteUsage([]).estimated_cost_usd).toBe(0);
  });
  it("simulação não consome tokens pagos", () => {
    expect(mockSiteUsage()).toMatchObject({source:"mock",total_tokens:0,estimated_cost_usd:0});
  });
});
