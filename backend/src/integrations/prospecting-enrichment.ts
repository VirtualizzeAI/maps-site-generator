import {z} from "zod";
import {normalizeText} from "../normalization.js";
import {isCouncilSource,isIndividualCouncilRecord,isRegistrySource,isRegistryRecord,validCnpj} from "./prospecting-sources.js";
import type {ProspectingFounder,ProspectingOperation,ProspectingRegistration} from "../prospecting-types.js";

const text=z.string().max(2000),name=z.string().trim().min(2).max(180);
const phone=z.object({number:z.string().max(80),source_url:text});
const email=z.object({email:z.string().max(254),source_url:text});
const partner=z.object({name,role:z.string().max(180),source_url:text});
export const registrationSchema=z.object({cnpj:z.string().max(30),legal_name:z.string().max(240),status:z.string().max(100),address:z.string().max(500),source_url:text,identity_match:z.enum(["matched","uncertain"]),identity_evidence:z.string().max(1200),partners:z.array(partner).max(20),phones:z.array(phone).max(10),emails:z.array(email).max(10)}).nullable().optional();
export const foundersSchema=z.array(z.object({name,relationship:z.enum(["founder","partner"]),source_url:text,evidence:z.string().min(10).max(1200),confirmation:z.enum(["confirmed","uncertain"]),profiles:z.array(z.object({url:text,source_url:text,context:z.enum(["professional","personal","unknown"])})).max(6),contacts:z.array(z.object({kind:z.enum(["phone","email"]),value:z.string().max(254),source_url:text,context:z.enum(["professional","personal","unknown"])})).max(6),medical_registrations:z.array(z.object({number:z.string().max(20),uf:z.string().max(4),status:z.string().max(160),source_url:text,identity_evidence:z.string().max(1200),identity_match:z.enum(["matched","uncertain"])})).max(5)})).max(6).optional();
const states=new Set("AC AL AP AM BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" "));
const emailValue=(value:string)=>z.email().safeParse(value.trim()).success?value.trim().toLowerCase():null;
const phoneValue=(value:string)=>{const digits=value.replace(/\D/g,"");return /^\d{10,15}$/.test(digits)?digits:null;};
const dedupe=<T>(values:T[],key:(item:T)=>string)=>[...new Map(values.map(x=>[key(x),x])).values()];
type Options=Pick<ProspectingOperation,"collect_linkedin"|"collect_contacts">;
export function parseEnrichment(data:{registration?:z.infer<typeof registrationSchema>;founders?:z.infer<typeof foundersSchema>},op:Options,verified:(value:unknown)=>string|null,used:Set<string>,notes:string[]){
 const remember=(value:string)=>{used.add(value);return value;};
 let registration:ProspectingRegistration|null=null;
 const r=data.registration,cnpj=r&&validCnpj(r.cnpj),source=r&&verified(r.source_url);
 if(r&&cnpj&&source&&r.identity_match==="matched"&&r.identity_evidence.trim().length>=20){
  const partners=op.collect_linkedin?r.partners.flatMap(p=>{const s=verified(p.source_url);return s&&isRegistryRecord(s)?[{name:p.name,role:p.role,source_url:s}]:[];}):[];
  const phones=op.collect_contacts?r.phones.flatMap(p=>{const s=verified(p.source_url),number=phoneValue(p.number);return s&&isRegistryRecord(s)&&number?[{number,source_url:s}]:[];}):[];
  const emails=op.collect_contacts?r.emails.flatMap(p=>{const s=verified(p.source_url),email=emailValue(p.email);return s&&isRegistryRecord(s)&&email?[{email,source_url:s}]:[];}):[];
  registration={cnpj,legal_name:r.legal_name,status:r.status,address:r.address,source_url:remember(source),identity_evidence:r.identity_evidence,partners:dedupe(partners,p=>normalizeText(p.name)),phones:dedupe(phones,p=>p.number),emails:dedupe(emails,p=>p.email)};
  for(const entry of [...registration.partners,...registration.phones,...registration.emails])remember(entry.source_url);
 }else if(r)notes.push("CNPJ omitido por identificação incerta, dígitos inválidos ou ausência de fonte consultada.");
 const founders:ProspectingFounder[]=op.collect_linkedin?(data.founders||[]).flatMap(p=>{
  const source=verified(p.source_url);if(!source)return [];
  if(p.relationship==="founder"&&isRegistrySource(source))return [];
  if(p.relationship==="partner"&&(!registration||!registration.partners.some(q=>normalizeText(q.name)===normalizeText(p.name))))return [];
  const profiles=p.profiles.flatMap(profile=>{const url=verified(profile.url),s=verified(profile.source_url);if(!url||!s||profile.context!=="professional")return [];const u=new URL(url),linkedin=u.hostname==="linkedin.com";return /(^|\.)(instagram\.com|facebook\.com|linkedin\.com)$/.test(u.hostname)&&(op.collect_contacts||linkedin)&&(!linkedin||/^\/in\/[^/]+$/.test(u.pathname))?[{url,source_url:s}]:[];});
  const contacts=op.collect_contacts&&p.confirmation==="confirmed"?p.contacts.flatMap(c=>{const s=verified(c.source_url),value=c.kind==="email"?emailValue(c.value):phoneValue(c.value);return s&&value&&c.context==="professional"?[{kind:c.kind,value,source_url:s}]:[];}):[];
  const medical=p.confirmation==="confirmed"?p.medical_registrations.flatMap(m=>{const s=verified(m.source_url),uf=m.uf.trim().toUpperCase(),number=m.number.trim();if(!s||m.identity_match!=="matched"||!states.has(uf)||!/^\d{1,8}$/.test(number)||m.identity_evidence.trim().length<20||isCouncilSource(s)&&!isIndividualCouncilRecord(s))return [];return [{number,uf,status:m.status,source_url:s,identity_evidence:m.identity_evidence,official_confirmation:isIndividualCouncilRecord(s)}];}):[];
  remember(source);for(const profile of profiles){remember(profile.url);remember(profile.source_url);}for(const entry of [...contacts,...medical])remember(entry.source_url);
  return [{name:p.name,relationship:p.relationship,source_url:source,evidence:p.evidence,confirmation:p.confirmation,profiles:dedupe(profiles,x=>x.url),contacts:dedupe(contacts,x=>x.kind+":"+x.value),medical_registrations:dedupe(medical,x=>x.uf+":"+x.number)}];
 }):[];
 return {registration,founders:dedupe(founders,x=>normalizeText(x.name))};
}
