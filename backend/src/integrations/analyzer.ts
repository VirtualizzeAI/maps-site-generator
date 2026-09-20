import { config } from "../config.js";
import type { SearchCandidate } from "../types.js";

export interface DiscoveredContacts { emails:string[]; socialLinks:string[]; phones:string[] }
const emptyContacts=():DiscoveredContacts=>({emails:[],socialLinks:[],phones:[]});

export async function analyzePresence(candidate:SearchCandidate){
  if(!candidate.phone)return {score:0,decision:"discarded_no_phone",evidence:{phone:false,reason:"Telefone não localizado"},discovered:emptyContacts()};
  if(config.mode==="mock")return candidate.website?{score:92,decision:"discarded_site_real",evidence:{website:candidate.website,reachable:true,quality:"strong"},discovered:{emails:candidate.email?[candidate.email]:[],socialLinks:candidate.social_links,phones:candidate.other_phones}}:{score:24,decision:"eligible",evidence:{website:null,maps_only:true},discovered:{emails:candidate.email?[candidate.email]:[],socialLinks:candidate.social_links,phones:candidate.other_phones}};
  if(!candidate.website)return {score:30,decision:"eligible",evidence:{website:null,maps_only:true},discovered:emptyContacts()};
  try{const response=await fetch(candidate.website,{signal:AbortSignal.timeout(12000),headers:{"User-Agent":"Mozilla/5.0"}});const raw=(await response.text()).slice(0,300000),text=raw.toLowerCase(),viewport=/name=["']viewport/.test(text),contact=["whatsapp","contato","telefone"].some(term=>text.includes(term)),discovered=extractContacts(raw);const score=35+(response.ok?25:0)+(viewport?20:0)+(contact?20:0);return {score,decision:score>=65?"discarded_site_real":"eligible",evidence:{website:candidate.website,reachable:response.ok,viewport,contact},discovered}}catch(error){return {score:35,decision:"eligible",evidence:{website:candidate.website,reachable:false,error:String(error)},discovered:emptyContacts()}}
}

function extractContacts(html:string):DiscoveredContacts{
  const emails=[...html.matchAll(/mailto:([^"'?#\s<>]+)/gi)].map(match=>decodeURIComponent(match[1]||"").toLowerCase()).filter(Boolean);
  const socialLinks=[...html.matchAll(/https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|youtube\.com)\/[^"'\s<>]+/gi)].map(match=>(match[0]||"").replace(/&amp;.*$/,""));
  const phones=[...html.matchAll(/tel:([^"'?#\s<>]+)/gi)].map(match=>decodeURIComponent(match[1]||"")).filter(Boolean);
  return{emails:[...new Set(emails)],socialLinks:[...new Set(socialLinks)],phones:[...new Set(phones)]};
}
