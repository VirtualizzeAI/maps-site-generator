import type { SiteGenerationUsage } from "./site-generation-usage";
export type AnalysisModel = "gpt-6-luna" | "gpt-6.1-sol" | "gpt-6-astra";
export const analysisModelOptions: {id: AnalysisModel; label: string; price: string}[] = [
  {id:"gpt-6-luna",label:"GPT-6 Luna — mais econômico",price:"Entrada US$ 0,10 · saída US$ 0,50 por milhão de tokens"},
  {id:"gpt-6.1-sol",label:"GPT-6.1 Sol — equilíbrio recomendado",price:"Entrada US$ 2,00 · saída US$ 10,00 por milhão de tokens"},
  {id:"gpt-6-astra",label:"GPT-6 Astra — mais potente e caro",price:"Entrada US$ 10,00 · saída US$ 50,00 por milhão de tokens"},
];
export interface AdvancedReport {
  model: string; decision: string; reason: string; confidence: number; sources: string[];
  websites: {url: string; kind: string; evidence: string}[];
  usage: {tokens: SiteGenerationUsage; web_search_calls: number; search_cost_usd: number; estimated_cost_usd: number | null} | null;
}
export interface AnalysisTotals {analyzed: number; web_search_calls: number; total_tokens: number; estimated_cost_usd: number; unpriced: number}
const usd=(n:number)=>`US$ ${n.toLocaleString("pt-BR",{minimumFractionDigits:6,maximumFractionDigits:6})}`;
const safe=(url:string)=>/^https?:\/\//i.test(url);
export function AdvancedAnalysisReport({report}:{report:AdvancedReport}) {
 const labels:Record<string,string>={eligible:"Elegível para geração",discarded_site_real:"Site próprio identificado",analysis_inconclusive:"Análise inconclusiva"};
 return <section className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-slate-700">
  <p className="font-semibold">Análise avançada · {labels[report.decision] || report.decision}</p>
  <p>{report.model} · Confiança informada pela IA: {report.confidence}%</p><p className="whitespace-pre-wrap break-words">{report.reason}</p>
  {report.websites.map(w=>safe(w.url)&&<div key={w.url} className="break-words"><a href={w.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">{w.url}</a> · {({official:"Site oficial",social:"Rede social",directory:"Diretório",other:"Outro"} as Record<string,string>)[w.kind]}<p>{w.evidence}</p></div>)}
  {report.sources.length>0&&<details><summary className="cursor-pointer font-semibold">Fontes consultadas ({report.sources.length})</summary><ul className="mt-2 space-y-1">{report.sources.filter(safe).map(url=><li key={url} className="break-words"><a href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{url}</a></li>)}</ul></details>}
  <p>{report.usage?.tokens.source === "mock" ? "Simulação · " : ""}{report.usage?.tokens.total_tokens?.toLocaleString("pt-BR") ?? "Sem registro de"} tokens · {report.usage?.web_search_calls ?? "?"} chamadas web</p>
  <p className="font-semibold">Custo estimado da análise: {report.usage?.estimated_cost_usd == null ? "Indisponível" : usd(report.usage.estimated_cost_usd)}</p>
 </section>;
}
export function AnalysisCostSummary({totals}:{totals?:AnalysisTotals}) {
 if(!totals?.analyzed)return null;
 return <section aria-label="Custo das análises avançadas" className="mt-4 rounded-xl border border-violet-100 bg-white p-4 text-sm text-slate-700"><b>Análises avançadas: {usd(totals.estimated_cost_usd)}</b><p className="mt-1">{totals.analyzed} análises · {totals.total_tokens.toLocaleString("pt-BR")} tokens · {totals.web_search_calls} chamadas web</p><p className="mt-1 text-xs">Pesquisa e análise, separadas do custo de gerar os sites. {totals.unpriced>0?`Total parcial: ${totals.unpriced} sem custo disponível.`:""}</p></section>;
}
