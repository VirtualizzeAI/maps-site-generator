import { describe, expect, it } from "vitest";
import { resolveWhatsAppRecipient } from "../src/integrations/whatsapp.js";
import type { IntegrationSettings } from "../src/types.js";

const integration=(overrides:Partial<IntegrationSettings>={}):IntegrationSettings=>({
  organization_id:"org-1",serper_api_key:"",openai_api_key:"",openai_model:"gpt-5-mini",vercel_token:"",
  evolution_url:"",evolution_api_key:"",evolution_instance:"",whatsapp_test_mode:false,whatsapp_test_number:"",updated_at:new Date().toISOString(),...overrides,
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
