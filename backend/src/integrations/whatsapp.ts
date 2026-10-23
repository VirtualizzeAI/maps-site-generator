import { createHash } from "node:crypto";
import { config } from "../config.js";
import { normalizePhone } from "../normalization.js";
import type { IntegrationSettings } from "../types.js";

export interface WhatsAppSendResult { providerMessageId:string; originalRecipient:string; actualRecipient:string; redirected:boolean }

// Somente mensagens controladas podem ser apresentadas ao usuário da API.
export class WhatsAppDeliveryError extends Error {
  statusCode = 502;
  constructor(message: string) { super(message); this.name = "WhatsAppDeliveryError"; }
}

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
  const url=integration.evolution_url||config.evolutionUrl,key=integration.evolution_api_key||config.evolutionApiKey;
  if(!url||!key)throw new WhatsAppDeliveryError("Evolution Go não configurada");
  const base=url.replace(/\/+$/,"");
  const instance=integration.evolution_instance||config.evolutionInstance;
  const postText=(token:string)=>fetch(`${base}/send/text`,{method:"POST",headers:{apikey:token,"Content-Type":"application/json"},body:JSON.stringify({number:phone,text:content})});
  let response=await postText(key);
  // 401 confirma que nenhum envio foi aceito. Só nesse caso resolvemos a
  // chave administrativa para a instância exata e repetimos com seu token.
  if(response.status===401 && instance){
    const lookup=await fetch(`${base}/instance/all`,{headers:{apikey:key}});
    if(!lookup.ok)throw new WhatsAppDeliveryError(`Evolution Go recusou a chave configurada (HTTP ${lookup.status})`);
    const result=await lookup.json() as {data?:Array<{name?:string;token?:string}>};
    const matches=Array.isArray(result.data)?result.data.filter(item=>item.name===instance):[];
    const token=matches.length===1?matches[0]?.token:undefined;
    if(!token)throw new WhatsAppDeliveryError("Instância Evolution Go não encontrada. Confira o nome nas configurações.");
    response=await postText(token);
  }
  if(!response.ok)throw new WhatsAppDeliveryError(`Evolution Go retornou ${response.status}. Confira a chave e a conexão da instância.`);
  const data=await response.json() as {data?:{Info?:{ID?:unknown}}};
  const providerMessageId=data?.data?.Info?.ID;
  if(typeof providerMessageId!=="string"||!providerMessageId.trim())throw new WhatsAppDeliveryError("Evolution Go retornou resposta sem identificador da mensagem. Confira o envio na instância antes de tentar novamente.");
  return{providerMessageId,...resolved};
}
