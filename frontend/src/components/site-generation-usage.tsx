export interface SiteGenerationUsage {
  source: "openai" | "mock";
  model: string;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  cache_write_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
}
export interface GenerationTotals {
  recorded_generations: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  unpriced_generations: number;
  missing_usage: number;
}
const count = (value: number | null) => value === null ? "Sem registro" : value.toLocaleString("pt-BR");
const cost = (value: number) => `US$ ${value.toLocaleString("pt-BR", {minimumFractionDigits: 6, maximumFractionDigits: 6})}`;

export function SiteUsage({usage}: {usage?: SiteGenerationUsage | null}) {
  if (!usage) return <p className="mt-2 text-xs text-slate-500">Tokens e custo: sem registro histórico.</p>;
  return <div className="mt-3 space-y-1 rounded-lg bg-blue-50 p-3 text-xs text-slate-600">
    <p className="font-semibold text-slate-800">Geração do site · {usage.source === "mock" ? "Simulação, sem cobrança" : usage.model}</p>
    <p>{count(usage.total_tokens)} tokens no total</p>
    <p>Entrada: {count(usage.input_tokens)} · Saída: {count(usage.output_tokens)}</p>
    <p>Cache lido: {count(usage.cached_input_tokens)} · Cache gravado: {count(usage.cache_write_tokens)}</p>
    <p>Raciocínio: {count(usage.reasoning_tokens)} (já incluído na saída)</p>
    <p className="font-semibold">Custo estimado: {usage.estimated_cost_usd === null ? "Indisponível para esta geração" : cost(usage.estimated_cost_usd)}</p>
  </div>;
}

export function GenerationCostSummary({totals, allTime = false}: {totals?: GenerationTotals; allTime?: boolean}) {
  if (!totals) return null;
  return <section className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" aria-label="Consumo da geração de sites">
    <h2 className="font-semibold">Tokens e custo da geração de sites{allTime ? " — acumulado" : " nesta operação"}</h2>
    <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <p><b>{count(totals.total_tokens)}</b> tokens registrados</p>
      <p>Entrada: {count(totals.input_tokens)} · Saída: {count(totals.output_tokens)}</p>
      <p>Custo estimado registrado: <b>{cost(totals.estimated_cost_usd)}</b></p>
    </div>
    <p className="mt-2 text-xs text-slate-500">{totals.recorded_generations} gerações registradas. {allTime ? "Inclui operações e empresas arquivadas. " : ""}Somente OpenAI; não inclui Serper, Vercel ou WhatsApp. Tarifas salvas no momento da geração.</p>
    {(totals.missing_usage > 0 || totals.unpriced_generations > 0) && <p className="mt-2 text-xs text-amber-700">Total parcial: {totals.missing_usage} gerações sem registro de tokens; {totals.unpriced_generations} sem custo disponível. Dados antigos não são estimados retroativamente.</p>}
  </section>;
}
