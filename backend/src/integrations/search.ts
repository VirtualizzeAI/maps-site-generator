import { config } from "../config.js";
import { deterministicNumber } from "../normalization.js";
import type { IntegrationSettings, SearchCandidate } from "../types.js";

export async function searchCompanies(niche:string,city:string,limit:number,integration:IntegrationSettings):Promise<SearchCandidate[]>{
  if(config.mode==="mock")return mockSearch(niche,city,limit);
  const key=integration.serper_api_key||config.serperApiKey;if(!key)throw new Error("SERPER_API_KEY não configurada");
  const response=await fetch("https://google.serper.dev/maps",{method:"POST",headers:{"X-API-KEY":key,"Content-Type":"application/json"},body:JSON.stringify({q:`${niche} em ${city}`,gl:"br",hl:"pt-br"})});
  if(!response.ok)throw new Error(`Serper retornou ${response.status}`);
  const data=await response.json() as {places?:Record<string,unknown>[]};
  return (data.places||[]).slice(0,limit).map(place=>({name:String(place.title||"Empresa sem nome"),phone:place.phoneNumber?String(place.phoneNumber):place.phone?String(place.phone):null,address:place.address?String(place.address):null,city,category:place.category?String(place.category):niche,website:place.website?String(place.website):null,source_id:place.cid?String(place.cid):place.placeId?String(place.placeId):null}));
}

function mockSearch(niche:string,city:string,limit:number):SearchCandidate[]{
  const seed=deterministicNumber(`${niche}:${city}`),suffixes=["Prime","Essencial","Imperial","Studio","Mais","Center","Ideal","Premium"],streets=["Av. Central","Rua das Flores","Rua do Comércio","Av. Principal"];
  return Array.from({length:limit},(_,index)=>({name:`${niche} ${suffixes[index%suffixes.length]} ${index+1}`,phone:index%7===6?null:`55849${String((seed+index*7919)%100000000).padStart(8,"0")}`,address:`${streets[index%streets.length]}, ${100+(seed+index*37)%899}`,city,category:niche,website:index%5===4?`https://empresa-${index+1}.example.com`:null,source_id:`mock-${seed}-${index}`}));
}
