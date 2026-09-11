import html
import re

from openai import OpenAI

from src.integrations.search import SearchCandidate


def generate_site(candidate: SearchCandidate, api_key: str | None, model: str, mock: bool) -> str:
    if not mock:
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY não configurada")
        response = OpenAI(api_key=api_key).responses.create(
            model=model,
            input=("Crie um site completo em um único arquivo HTML responsivo, em português, sem markdown. "
                   f"Empresa: {candidate.name}; segmento: {candidate.category}; cidade: {candidate.city}; "
                   f"endereço: {candidate.address}; WhatsApp: {candidate.phone}. Use CSS embutido e CTA de WhatsApp."),
        )
        content = response.output_text.strip()
        content = re.sub(r"^```(?:html)?\s*|\s*```$", "", content, flags=re.I)
        if "<html" not in content.lower():
            raise RuntimeError("A IA não retornou um HTML válido")
        return content
    name, category, city = map(html.escape, (candidate.name, candidate.category, candidate.city))
    address = html.escape(candidate.address or city)
    phone = re.sub(r"\D", "", candidate.phone or "")
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name}</title><style>*{{box-sizing:border-box}}body{{margin:0;font-family:Arial,sans-serif;background:#07111f;color:#eaf6ff}}main{{min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 80% 20%,#123f69,transparent 40%)}}section{{max-width:860px}}small{{color:#49d3ff;text-transform:uppercase;letter-spacing:.15em}}h1{{font-size:clamp(42px,8vw,84px);line-height:.95;margin:20px 0}}p{{font-size:20px;color:#b9c9d8;max-width:680px;line-height:1.6}}a{{display:inline-block;margin-top:24px;background:#19c37d;color:#04150e;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:700}}footer{{margin-top:56px;color:#8295a7}}</style></head><body><main><section><small>{category} em {city}</small><h1>{name}</h1><p>Atendimento de qualidade, cuidado em cada detalhe e uma experiência feita para você. Visite-nos em {address}.</p><a href="https://wa.me/{phone}">Falar pelo WhatsApp</a><footer>Site demonstrativo criado pela Virtualizze</footer></section></main></body></html>'''
