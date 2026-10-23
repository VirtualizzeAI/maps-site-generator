import type { SearchCandidate } from "./types.js";

export const DEFAULT_SITE_GENERATION_PROMPT = `Crie um site completo em um único HTML responsivo, em português, sem markdown.
Empresa: {{empresa}}
Segmento: {{segmento}}
Cidade: {{cidade}}
Endereço: {{endereco}}
WhatsApp: {{whatsapp}}
Use CSS embutido e CTA de WhatsApp.`;

export function siteGenerationInput(candidate: SearchCandidate, template?: string) {
  const company = {
    empresa: candidate.name,
    segmento: candidate.category,
    cidade: candidate.city,
    endereco: candidate.address || "Não informado",
    whatsapp: candidate.phone || "Não informado",
  };
  const prompt = template?.trim() || DEFAULT_SITE_GENERATION_PROMPT;
  const rendered = prompt.replace(/\{\{\s*(empresa|segmento|cidade|endereco|whatsapp)\s*\}\}/g,
    (_match, variable: keyof typeof company) => company[variable]);
  return {
    instructions: `${rendered}\n\nFormato obrigatório da resposta: somente um documento HTML completo e válido, sem blocos de markdown nem explicações fora do HTML.`,
    // Os dados continuam disponíveis mesmo se o administrador omitir variáveis.
    input: `Crie o site usando os seguintes dados da empresa:\n${JSON.stringify(company)}`,
  };
}
