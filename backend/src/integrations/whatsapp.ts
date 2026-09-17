import { createHash } from "node:crypto";
import { config } from "../config.js";
import type { IntegrationSettings } from "../types.js";

export async function sendWhatsApp(recipient:string,content:string,integration:IntegrationSettings){
  const phone=recipient.replace(/\D/g,"");
  if(config.mode==="mock")return `mock-${createHash("sha256").update(`${phone}:${content}`).digest("hex").slice(0,16)}`;
  const url=integration.evolution_url||config.evolutionUrl,key=integration.evolution_api_key||config.evolutionApiKey,instance=integration.evolution_instance||config.evolutionInstance;if(!url||!key||!instance)throw new Error("Evolution API não configurada");
  const response=await fetch(`${url.replace(/\/$/,"")}/message/sendText/${instance}`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({number:phone,text:content})});if(!response.ok)throw new Error(`Evolution API retornou ${response.status}`);const data=await response.json() as {key?:{id?:string};id?:string};return data.key?.id||data.id||"sent";
}
