import { createHash } from "node:crypto";

export const normalizeText=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export const normalizePhone=(value:string)=>{let digits=value.replace(/\D/g,"");if(digits.startsWith("00"))digits=digits.slice(2);if(digits.length===10||digits.length===11)digits=`55${digits}`;return digits};
export const normalizeDomain=(value:string)=>{if(!value)return "";try{return new URL(value.includes("://")?value:`https://${value}`).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}};
export function identities(candidate:{source_id?:string|null;phone?:string|null;website?:string|null;name:string;address?:string|null}){
  const values:string[]=[];
  if(candidate.source_id)values.push(`place:${candidate.source_id}`);
  const phone=normalizePhone(candidate.phone||"");if(phone)values.push(`phone:${phone}`);
  const domain=normalizeDomain(candidate.website||"");if(domain)values.push(`domain:${domain}`);
  if(candidate.address)values.push(`name_address:${normalizeText(candidate.name)}|${normalizeText(candidate.address)}`);
  return values;
}
export const deterministicNumber=(value:string)=>parseInt(createHash("sha256").update(value).digest("hex").slice(0,8),16);
