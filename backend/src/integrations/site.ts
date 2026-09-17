import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, sitesDir } from "../config.js";
import { normalizeText } from "../normalization.js";
import type { IntegrationSettings, SearchCandidate } from "../types.js";

const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
const slugify=(value:string)=>normalizeText(value).replace(/\s+/g,"-").slice(0,100)||"site";

export async function createSite(candidate:SearchCandidate,integration:IntegrationSettings){
  let html:string;
  if(config.mode==="mock"){
    const name=escape(candidate.name),category=escape(candidate.category),city=escape(candidate.city),address=escape(candidate.address||candidate.city),phone=(candidate.phone||"").replace(/\D/g,"");
    html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#07111f;color:#eaf6ff}main{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 80% 20%,#123f69,transparent 40%)}section{max-width:860px}small{color:#49d3ff;text-transform:uppercase;letter-spacing:.15em}h1{font-size:clamp(42px,8vw,84px);line-height:.95;margin:20px 0}p{font-size:20px;color:#b9c9d8;max-width:680px;line-height:1.6}a{display:inline-block;margin-top:24px;background:#19c37d;color:#04150e;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:700}</style></head><body><main><section><small>${category} em ${city}</small><h1>${name}</h1><p>Atendimento de qualidade, cuidado em cada detalhe e uma experiência feita para você. Visite-nos em ${address}.</p><a href="https://wa.me/${phone}">Falar pelo WhatsApp</a></section></main></body></html>`;
  }else{
    const key=integration.openai_api_key||config.openaiApiKey;if(!key)throw new Error("OPENAI_API_KEY não configurada");
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:integration.openai_model||config.openaiModel,input:`Crie um site completo em um único HTML responsivo, em português, sem markdown. Empresa: ${candidate.name}; segmento: ${candidate.category}; cidade: ${candidate.city}; endereço: ${candidate.address}; WhatsApp: ${candidate.phone}. Use CSS embutido e CTA de WhatsApp.`})});
    if(!response.ok)throw new Error(`OpenAI retornou ${response.status}`);const body=await response.json() as {output_text?:string;output?:Array<{content?:Array<{text?:string}>}>};html=(body.output_text||body.output?.flatMap(item=>item.content||[]).map(item=>item.text||"").join("")||"").replace(/^```(?:html)?\s*|\s*```$/gi,"");if(!html.toLowerCase().includes("<html"))throw new Error("A IA não retornou HTML válido");
  }
  const slug=`${slugify(candidate.name)}-${randomUUID().slice(0,8)}`,dir=path.join(sitesDir,slug),file=path.join(dir,"index.html");await mkdir(dir,{recursive:true});await writeFile(file,html,"utf8");
  if(config.mode==="mock")return {url:`${config.publicApiUrl}/generated/${slug}/`,deploymentId:null,slug};
  const token=integration.vercel_token||config.vercelToken;if(!token)throw new Error("VERCEL_TOKEN não configurado");const response=await fetch("https://api.vercel.com/v13/deployments",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({name:slug,files:[{file:"index.html",data:html}],projectSettings:{framework:null}})});if(!response.ok)throw new Error(`Vercel retornou ${response.status}`);const deployed=await response.json() as {url:string;id:string};return {url:`https://${deployed.url}`,deploymentId:deployed.id,slug};
}
