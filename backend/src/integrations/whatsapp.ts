import { createHash } from "node:crypto";
import { config } from "../config.js";
import { normalizePhone } from "../normalization.js";
import type { IntegrationSettings } from "../types.js";

export interface WhatsAppSendResult { providerMessageId:string; originalRecipient:string; actualRecipient:string; redirected:boolean }

export function resolveWhatsAppRecipient(recipient:string,integration:IntegrationSettings){
  const originalRecipient=normalizePhone(recipient);
  if(!originalRecipient)throw new Error("Empresa sem telefone válido");
  if(!integration.whatsapp_test_mode)return{originalRecipient,actualRecipient:originalRecipient,redirected:false};
  const actualRecipient=normalizePhone(integration.whatsapp_test_number);
  if(!actualRecipient)throw new Error("Modo de teste ativo sem número de teste válido");
  return{originalRecipient,actualRecipient,redirected:true};
}

export async function sendWhatsApp(recipient:string,content:string,integration:IntegrationSettings){
  const resolved=resolveWhatsAppRecipient(recipient,integration),phone=resolved.actualRecipient;
  if(config.mode==="mock")return{providerMessageId:`mock-${createHash("sha256").update(`${phone}:${content}`).digest("hex").slice(0,16)}`,...resolved};
  const url=integration.evolution_url||config.evolutionUrl,key=integration.evolution_api_key||config.evolutionApiKey,instance=integration.evolution_instance||config.evolutionInstance;if(!url||!key||!instance)throw new Error("Evolution API não configurada");
  const response=await fetch(`${url.replace(/\/$/,"")}/message/sendText/${instance}`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({number:phone,text:content})});if(!response.ok)throw new Error(`Evolution API retornou ${response.status}`);const data=await response.json() as {key?:{id?:string};id?:string};return{providerMessageId:data.key?.id||data.id||"sent",...resolved};
}
