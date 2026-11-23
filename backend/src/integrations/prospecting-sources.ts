import {safeSource} from "./advanced-analyzer.js";

const within=(host:string,domain:string)=>host===domain||host.endsWith("."+domain);
export const registryDomains=["receita.fazenda.gov.br","receitafederal.gov.br","redesim.gov.br","econodata.com.br","cnpj.biz","cnpj.ws","cnpj.info","casadosdados.com.br","cnpjja.com","receitaws.com.br","juridicoonline.com.br","empresas.serasaexperian.com.br","informecadastral.com.br"];
export function canonical(value:unknown){
 const safe=safeSource(value);if(!safe)return null;
 const url=new URL(safe);url.hostname=url.hostname.replace(/^www\./,"");
 if(within(url.hostname,"linkedin.com"))url.hostname="linkedin.com";
 if(["linkedin.com","instagram.com","facebook.com"].some(d=>within(url.hostname,d)))url.search="";
 else {for(const key of [...url.searchParams.keys()])if(/^(utm_|fbclid$|gclid$|trk$)/i.test(key))url.searchParams.delete(key);url.searchParams.sort();}
 return url.toString().replace(/\/$/,"");
}
export function isRegistrySource(value:string){
 const url=new URL(value),host=url.hostname;
 return registryDomains.some(d=>within(host,d))||host==="gov.br"&&/^\/receitafederal\//.test(url.pathname);
}
export function isRegistryRecord(value:string){
 const url=new URL(value);
 return isRegistrySource(value)&&url.pathname!=="/"&&!/\/(noticias|perguntas|manuais|acesso-a-informacao|servicos\/consultar-cadastro)/i.test(url.pathname);
}
export function isRelevantSource(value:string){
 const url=new URL(value),host=url.hostname;
 if(isRegistrySource(value))return true;
 return !/(^|\.)(gov\.br|leg\.br|jus\.br)$/.test(host)&&!/(^|\.)(prefeitura|camara)[.-]/i.test(host);
}
const councilDomains=["cfm.org.br","crmac.org.br","cremal.org.br","cremam.org.br","crmap.org.br","cremeb.org.br","cremec.org.br","cremec.com.br","crmdf.org.br","crm-es.org.br","crmes.org.br","cremego.org.br","crmma.org.br","crmmg.org.br","crmms.org.br","crmmt.org.br","cremepa.org.br","crmpb.org.br","cremepe.org.br","crmpe.org.br","crm-pi.org.br","crmpr.org.br","cremerj.org.br","cremern.org.br","cremero.org.br","crmrr.org.br","cremers.org.br","cremese.org.br","cremesp.org.br","cremesc.org.br","crmto.org.br"];
export const isCouncilSource=(value:string)=>councilDomains.some(d=>within(new URL(value).hostname,d));
export function isIndividualCouncilRecord(value:string){
 const u=new URL(value);
 return isCouncilSource(value)&&!(u.pathname==="/"||/^\/(busca-medicos|medicos|cidadao)\/?$/.test(u.pathname)&&!u.search);
}

// Receita Federal: módulo 11, ASCII - 48; aceita os formatos numérico e alfanumérico.
export function validCnpj(value:string){
 const cnpj=value.trim().toUpperCase().replace(/[.\/\s-]/g,"");
 if(!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)||/^(\d)\1{13}$/.test(cnpj))return null;
 const digit=(base:string)=>{let sum=0,weight=2;for(let i=base.length-1;i>=0;i--){sum+=(base.charCodeAt(i)-48)*weight;weight=weight===9?2:weight+1;}const rest=sum%11;return rest<2?"0":String(11-rest);};
 return digit(cnpj.slice(0,12))===cnpj[12]&&digit(cnpj.slice(0,13))===cnpj[13]?cnpj:null;
}
