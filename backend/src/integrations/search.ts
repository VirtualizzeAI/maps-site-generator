import { config } from "../config.js";
import { deterministicNumber } from "../normalization.js";
import type { IntegrationSettings, SearchCandidate } from "../types.js";

export async function searchCompanies(niche:string,city:string,limit:number,integration:IntegrationSettings):Promise<SearchCandidate[]>{
  if(config.mode==="mock")return mockSearch(niche,city,limit);
  const key=integration.serper_api_key||config.serperApiKey;if(!key)throw new Error("SERPER_API_KEY não configurada");
  const response=await fetch("https://google.serper.dev/maps",{method:"POST",headers:{"X-API-KEY":key,"Content-Type":"application/json"},body:JSON.stringify({q:`${niche} em ${city}`,gl:"br",hl:"pt-br"})});
  if(!response.ok)throw new Error(`Serper retornou ${response.status}`);
  const data=await response.json() as {places?:Record<string,unknown>[]};
  return (data.places||[]).slice(0,limit).map(place=>{
    const sourceId=place.cid?String(place.cid):place.placeId?String(place.placeId):null,urls=collectUrls(place),website=place.website?String(place.website):null;
    const socialLinks=urls.filter(url=>/instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|youtube\.com/i.test(url));
    const mapsUrl=place.link?String(place.link):place.placeId?`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(String(place.placeId))}`:sourceId?`https://www.google.com/maps?cid=${encodeURIComponent(sourceId)}`:null;
    const phone=place.phoneNumber?String(place.phoneNumber):place.phone?String(place.phone):null;
    return{name:String(place.title||"Empresa sem nome"),phone,other_phones:collectPhones(place).filter(item=>item!==phone),email:place.email?String(place.email):null,address:place.address?String(place.address):null,city,category:place.category?String(place.category):niche,website,maps_url:mapsUrl,social_links:[...new Set(socialLinks)],source_id:sourceId,raw_data:place};
  });
}

function mockSearch(niche:string,city:string,limit:number):SearchCandidate[]{
  const seed=deterministicNumber(`${niche}:${city}`),suffixes=["Prime","Essencial","Imperial","Studio","Mais","Center","Ideal","Premium"],streets=["Av. Central","Rua das Flores","Rua do Comércio","Av. Principal"];
  return Array.from({length:limit},(_,index)=>({name:`${niche} ${suffixes[index%suffixes.length]} ${index+1}`,phone:index%7===6?null:`55849${String((seed+index*7919)%100000000).padStart(8,"0")}`,other_phones:[],email:index%3===0?`contato${index+1}@exemplo.com`:null,address:`${streets[index%streets.length]}, ${100+(seed+index*37)%899}`,city,category:niche,website:index%5===4?`https://empresa-${index+1}.example.com`:null,maps_url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${niche} ${index+1} ${city}`)}`,social_links:index%2===0?[`https://instagram.com/empresa${index+1}`]:[],source_id:`mock-${seed}-${index}`,raw_data:{mock:true}}));
}

function collectUrls(value:unknown,result:string[]=[]):string[]{
  if(typeof value==="string"&&/^https?:\/\//i.test(value))result.push(value);
  else if(Array.isArray(value))for(const item of value)collectUrls(item,result);
  else if(value&&typeof value==="object")for(const item of Object.values(value as Record<string,unknown>))collectUrls(item,result);
  return result;
}

function collectPhones(place:Record<string,unknown>){const values=[place.phone,place.phoneNumber,place.phoneNumbers,place.additionalPhones].flatMap(value=>Array.isArray(value)?value:[value]);return [...new Set(values.filter((value):value is string=>typeof value==="string"&&/\d/.test(value)))]}
