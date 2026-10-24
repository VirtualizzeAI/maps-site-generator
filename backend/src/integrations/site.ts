import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, sitesDir } from "../config.js";
import { normalizeText } from "../normalization.js";
import { siteUsage, mockSiteUsage, type SiteGenerationUsage } from "../site-usage.js";
import { siteGenerationInput } from "../site-prompt.js";
import type { IntegrationSettings, SearchCandidate } from "../types.js";

const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
const slugify=(value:string)=>normalizeText(value).replace(/\s+/g,"-").slice(0,100)||"site";

type VercelDeployment = {
  alias?: string[];
  aliasAssigned?: boolean;
  errorCode?: string;
  errorMessage?: string;
  id: string;
  projectId?: string;
  readyState?: "BUILDING"|"CANCELED"|"ERROR"|"INITIALIZING"|"QUEUED"|"READY";
  target?: "production"|"staging"|null;
  url: string;
};

const vercelHeaders=(token:string)=>({Authorization:`Bearer ${token}`,"Content-Type":"application/json"});
const wait=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const absoluteUrl=(domain:string)=>domain.startsWith("http://")||domain.startsWith("https://")?domain:`https://${domain}`;

export function publicDeploymentUrl(deployment:VercelDeployment,projectName:string){
  const alias=deployment.alias?.find(domain=>domain.endsWith(".vercel.app"))||deployment.alias?.[0];
  return absoluteUrl(alias||`${projectName}.vercel.app`);
}

export async function publishToVercel(slug:string,html:string,token:string,fetcher:typeof fetch=fetch){
  const response=await fetcher("https://api.vercel.com/v13/deployments",{
    method:"POST",
    headers:vercelHeaders(token),
    body:JSON.stringify({
      name:slug,
      files:[{file:"index.html",data:html}],
      projectSettings:{framework:null},
      target:"production",
    }),
  });
  if(!response.ok)throw new Error(`Vercel retornou ${response.status}`);

  let deployment=await response.json() as VercelDeployment;
  // Projetos criados pela API podem herdar Vercel Authentication. Cada site
  // demonstrativo deve ficar público, independentemente do padrão da conta.
  const protection=await fetcher(`https://api.vercel.com/v9/projects/${encodeURIComponent(deployment.projectId||slug)}`,{
    method:"PATCH",
    headers:vercelHeaders(token),
    body:JSON.stringify({ssoProtection:null}),
  });
  if(!protection.ok)throw new Error(`Não foi possível tornar o site público na Vercel (HTTP ${protection.status})`);
  for(let attempt=0;attempt<30&&deployment.readyState!=="READY";attempt+=1){
    if(deployment.readyState==="ERROR"||deployment.readyState==="CANCELED"){
      throw new Error(deployment.errorMessage||`Deploy da Vercel terminou como ${deployment.readyState}`);
    }
    await wait(1000);
    const status=await fetcher(`https://api.vercel.com/v13/deployments/${deployment.id}`,{headers:vercelHeaders(token)});
    if(!status.ok)throw new Error(`Vercel retornou ${status.status} ao consultar o deploy`);
    deployment=await status.json() as VercelDeployment;
  }
  if(deployment.readyState!=="READY")throw new Error("O deploy da Vercel não ficou pronto dentro do tempo esperado");

  const url=publicDeploymentUrl(deployment,slug);
  let accessible=false;
  for(let attempt=0;attempt<5;attempt+=1){
    // Sem Authorization, cookies ou bypass: valida o acesso do destinatário.
    const publicResponse=await fetcher(url,{redirect:"manual",signal:AbortSignal.timeout(10000)});
    accessible=publicResponse.status===200;
    await publicResponse.body?.cancel();
    if(accessible)break;
    if(attempt<4)await wait(1000);
  }
  if(!accessible)throw new Error("O site não está acessível publicamente. Confira Deployment Protection na Vercel antes de enviar o link.");
  return {url,deploymentId:deployment.id,slug};
}

export async function createSite(candidate:SearchCandidate,integration:IntegrationSettings,onUsage?:(usage:SiteGenerationUsage)=>Promise<void>){
  let html:string;
  if(config.mode==="mock"){
    await onUsage?.(mockSiteUsage());
    const name=escape(candidate.name),category=escape(candidate.category),city=escape(candidate.city),address=escape(candidate.address||candidate.city),phone=(candidate.phone||"").replace(/\D/g,"");
    html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#07111f;color:#eaf6ff}main{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 80% 20%,#123f69,transparent 40%)}section{max-width:860px}small{color:#49d3ff;text-transform:uppercase;letter-spacing:.15em}h1{font-size:clamp(42px,8vw,84px);line-height:.95;margin:20px 0}p{font-size:20px;color:#b9c9d8;max-width:680px;line-height:1.6}a{display:inline-block;margin-top:24px;background:#19c37d;color:#04150e;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:700}</style></head><body><main><section><small>${category} em ${city}</small><h1>${name}</h1><p>Atendimento de qualidade, cuidado em cada detalhe e uma experiência feita para você. Visite-nos em ${address}.</p><a href="https://wa.me/${phone}">Falar pelo WhatsApp</a></section></main></body></html>`;
  }else{
    const key=integration.openai_api_key||config.openaiApiKey;if(!key)throw new Error("OPENAI_API_KEY não configurada");
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:integration.openai_model||config.openaiModel,...siteGenerationInput(candidate,integration.site_generation_prompt)})});
    if(!response.ok)throw new Error(`OpenAI retornou ${response.status}`);
    const body=await response.json() as Record<string,unknown> & {output_text?:string;output?:Array<{content?:Array<{text?:string}>}>};
    // Preserva o consumo mesmo se o HTML ou a publicação falharem depois.
    await onUsage?.(siteUsage(body,integration.openai_model||config.openaiModel));
    html=(body.output_text||body.output?.flatMap(item=>item.content||[]).map(item=>item.text||"").join("")||"").replace(/^```(?:html)?\s*|\s*```$/gi,"");if(!html.toLowerCase().includes("<html"))throw new Error("A IA não retornou HTML válido");
  }
  const slug=`${slugify(candidate.name)}-${randomUUID().slice(0,8)}`,dir=path.join(sitesDir,slug),file=path.join(dir,"index.html");await mkdir(dir,{recursive:true});await writeFile(file,html,"utf8");
  if(config.mode==="mock")return {url:`${config.publicApiUrl}/generated/${slug}/`,deploymentId:null,slug};
  const token=integration.vercel_token||config.vercelToken;
  if(!token)throw new Error("VERCEL_TOKEN não configurado");
  return publishToVercel(slug,html,token);
}
