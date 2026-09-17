import { config } from "../config.js";
import type { SearchCandidate } from "../types.js";

export async function analyzePresence(candidate:SearchCandidate){
  if(!candidate.phone)return {score:0,decision:"discarded_no_phone",evidence:{phone:false,reason:"Telefone não localizado"}};
  if(config.mode==="mock")return candidate.website?{score:92,decision:"discarded_site_real",evidence:{website:candidate.website,reachable:true,quality:"strong"}}:{score:24,decision:"eligible",evidence:{website:null,maps_only:true}};
  if(!candidate.website)return {score:30,decision:"eligible",evidence:{website:null,maps_only:true}};
  try{const response=await fetch(candidate.website,{signal:AbortSignal.timeout(12000),headers:{"User-Agent":"Mozilla/5.0"}});const text=(await response.text()).toLowerCase().slice(0,200000);const viewport=/name=["']viewport/.test(text),contact=["whatsapp","contato","telefone"].some(term=>text.includes(term));const score=35+(response.ok?25:0)+(viewport?20:0)+(contact?20:0);return {score,decision:score>=65?"discarded_site_real":"eligible",evidence:{website:candidate.website,reachable:response.ok,viewport,contact}}}catch(error){return {score:35,decision:"eligible",evidence:{website:candidate.website,reachable:false,error:String(error)}}}
}
