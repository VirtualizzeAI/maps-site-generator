import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWhatsAppRecipient, sendWhatsApp } from "../src/integrations/whatsapp.js";
import { config } from "../src/config.js";
import type { IntegrationSettings } from "../src/types.js";

const integration=(overrides:Partial<IntegrationSettings>={}):IntegrationSettings=>({
  organization_id:"org-1",serper_api_key:"",openai_api_key:"",openai_model:"gpt-5-mini",vercel_token:"",
  evolution_url:"",evolution_api_key:"",evolution_instance:"",whatsapp_test_mode:false,whatsapp_test_number:"",updated_at:new Date().toISOString(),...overrides,
});

describe("envio pela Evolution Go",()=>{
  const originalConfig={...config};
  afterEach(()=>{Object.assign(config,originalConfig);vi.restoreAllMocks();vi.unstubAllGlobals();});

  function realMode(){
    config.mode="real";
  }

  it("usa /send/text, chave da instância e número de teste, lendo data.Info.ID",async()=>{
    realMode();
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({message:"success",data:{Info:{ID:"go-123"}}}),{status:200}));
    vi.stubGlobal("fetch",fetchMock);
    const result=await sendWhatsApp("(84) 99999-1234","Mensagem de teste",integration({evolution_url:"https://go.example///",evolution_api_key:"instance-key",evolution_instance:"",whatsapp_test_mode:true,whatsapp_test_number:"(11) 98888-7777"}));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://go.example/send/text",{method:"POST",headers:{apikey:"instance-key","Content-Type":"application/json"},body:JSON.stringify({number:"5511988887777",text:"Mensagem de teste"})});
    expect(result).toEqual({providerMessageId:"go-123",originalRecipient:"5584999991234",actualRecipient:"5511988887777",redirected:true});
  });

  it("usa as mesmas variáveis de ambiente como fallback",async()=>{
    realMode();
    config.evolutionUrl="https://env-go.example";
    config.evolutionApiKey="env-key";
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{Info:{ID:"env-123"}}})));
    vi.stubGlobal("fetch",fetchMock);
    expect((await sendWhatsApp("(84) 99999-1234","Olá",integration())).providerMessageId).toBe("env-123");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://env-go.example/send/text");
    expect(fetchMock.mock.calls[0]?.[1].headers.apikey).toBe("env-key");
  });

  it("propaga falha HTTP sem expor o corpo do provedor",async()=>{
    realMode();
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("segredo do provedor",{status:401})));
    await expect(sendWhatsApp("(84) 99999-1234","Olá",integration({evolution_url:"https://go.example",evolution_api_key:"key"}))).rejects.toThrow("Evolution Go retornou 401");
  });

  it("não registra sucesso sem o ID retornado pela Go",async()=>{
    realMode();
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({message:"success"}))));
    await expect(sendWhatsApp("(84) 99999-1234","Olá",integration({evolution_url:"https://go.example",evolution_api_key:"key"}))).rejects.toThrow("sem identificador");
  });

  it("modo mock não chama o provedor",async()=>{
    config.mode="mock";
    const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
    expect((await sendWhatsApp("(84) 99999-1234","Olá",integration())).providerMessageId).toMatch(/^mock-/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("modo global de teste do WhatsApp",()=>{
  it("mantém o telefone da empresa quando o modo de teste está desligado",()=>{
    expect(resolveWhatsAppRecipient("(84) 99999-1234",integration())).toEqual({originalRecipient:"5584999991234",actualRecipient:"5584999991234",redirected:false});
  });

  it("redireciona todo envio para o telefone de teste",()=>{
    expect(resolveWhatsAppRecipient("(84) 99999-1234",integration({whatsapp_test_mode:true,whatsapp_test_number:"(11) 98888-7777"}))).toEqual({originalRecipient:"5584999991234",actualRecipient:"5511988887777",redirected:true});
  });

  it("bloqueia o envio se o modo de teste estiver ativo sem número",()=>{
    expect(()=>resolveWhatsAppRecipient("(84) 99999-1234",integration({whatsapp_test_mode:true}))).toThrow("Modo de teste ativo sem número de teste válido");
  });
});

