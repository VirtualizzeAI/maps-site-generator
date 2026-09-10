import os
import re
import json
import time
import csv
import requests
from datetime import datetime
from openai import OpenAI

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SERPER_KEY      = os.getenv("SERPER_API_KEY", "")
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")
VERCEL_TOKEN    = os.getenv("VERCEL_TOKEN", "")
EVOLUTION_URL   = os.getenv("EVOLUTION_URL", "")
EVOLUTION_KEY   = os.getenv("EVOLUTION_API_KEY", "")
EVOLUTION_INST  = os.getenv("EVOLUTION_INSTANCE", "")

SITES_DIR       = "./sites"
RESULTS_CSV     = "./resultados.csv"

# Segmento e cidade que você quer prospectar
QUERY           = "clínicas odontológicas Mossoró RN"
LIMITE          = 10  # quantas empresas buscar por rodada

# ─── CLIENTES ─────────────────────────────────────────────────────────────────
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# ─── 1. BUSCAR EMPRESAS ───────────────────────────────────────────────────────
def buscar_empresas(query, limite=10):
    print(f"[BUSCA] Pesquisando: {query}")
    headers = {
        "X-API-KEY": SERPER_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "q": query,
        "num": limite,
        "hl": "pt-br",
        "gl": "br",
    }
    resp = requests.post("https://google.serper.dev/maps", headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()

    empresas = []
    for r in data.get("places", []):
        empresas.append({
            "nome":     r.get("title", ""),
            "telefone": r.get("phoneNumber", ""),
            "website":  r.get("website", ""),
            "endereco": r.get("address", ""),
            "categoria":r.get("type", ""),
        })
    print(f"[BUSCA] {len(empresas)} empresas encontradas")
    return empresas

# ─── 2. VERIFICAR SITE ────────────────────────────────────────────────────────
LINK_PAGE_DOMAINS = [
    "linktree", "linktr.ee", "bio.link", "beacons.ai",
    "taplink", "campsite.bio", "lnk.bio", "solo.to",
    "carrd.co", "about.me", "bento.me"
]

def verificar_site(url):
    if not url:
        return "sem_site"

    # domínio de página de links conhecida
    for d in LINK_PAGE_DOMAINS:
        if d in url:
            return "pagina_link"

    try:
        resp = requests.get(url, timeout=8, allow_redirects=True)
        html = resp.text.lower()

        # heurística básica: páginas de link têm poucos links e pouco texto
        num_links = html.count("<a ")
        num_palavras = len(html.split())

        if num_links < 8 and num_palavras < 300:
            return "pagina_link"

        return "site_real"

    except Exception as e:
        print(f"[SITE] Erro ao acessar {url}: {e}")
        return "sem_site"

# ─── 3. GERAR HTML COM GPT ───────────────────────────────────────────────────
SYSTEM_PROMPT = """Retorne APENAS o código HTML completo, sem markdown, sem explicações, sem blocos de código, sem comentários antes ou depois. Apenas o HTML puro começando em <!DOCTYPE html>."""
 
def gerar_html(empresa):
    print(f"[GPT] Gerando site para: {empresa['nome']}")
    # monta número WhatsApp limpo
    numero_wa = re.sub(r"\D", "", empresa["telefone"])
    if not numero_wa.startswith("55"):
        numero_wa = "55" + numero_wa
 
    user_msg = f"""Crie um site para essa empresa que encontrei no google.
O site deve ter design bonito, ser responsivo para mobile, e focado em conversões.
 
{empresa['nome']}
{empresa['categoria']}
{empresa['endereco']}
Telefone: {empresa['telefone']}
WhatsApp: https://wa.me/{numero_wa}
 
Use esse número de WhatsApp real nos botões de CTA do site.
O site deve ser um único arquivo HTML com CSS e JS inline.
Sem imagens externas — use gradientes, formas e elementos CSS no lugar de fotos.
"""
    resp = openai_client.chat.completions.create(
        model="gpt-5.6-luna",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        max_completion_tokens=16000,
        reasoning_effort="low",
    )
    html = resp.choices[0].message.content.strip()
    # remove blocos markdown se o modelo insistir
    html = re.sub(r"^```html\s*", "", html, flags=re.IGNORECASE)
    html = re.sub(r"\s*```$", "", html)
    html = html.strip()
 
    choice = resp.choices[0]
    print(f"[GPT] finish_reason: {choice.finish_reason}")
    print(f"[GPT] message keys: {vars(choice.message).keys()}")
    
    # modelos de raciocínio podem retornar em campos diferentes
    html = ""
    if choice.message.content:
        html = choice.message.content.strip()
    elif hasattr(choice.message, "reasoning_content") and choice.message.reasoning_content:
        # não é o campo certo, mas loga para debug
        print(f"[GPT] reasoning_content (primeiros 200): {str(choice.message.reasoning_content)[:200]}")
    
    # remove blocos markdown se o modelo insistir
    html = re.sub(r"^```html\s*", "", html, flags=re.IGNORECASE)
    html = re.sub(r"\s*```$", "", html)
    html = html.strip()
 
    print(f"[GPT] HTML gerado: {len(html)} caracteres")
    if html:
        print(f"[GPT] Início: {html[:100]}")
 
    if len(html) < 200 or "<!DOCTYPE" not in html.upper():
        print(f"[ERRO] HTML invalido ou vazio.")
        raise ValueError("HTML gerado invalido")
 
    return html

# ─── 4. SALVAR HTML LOCAL ────────────────────────────────────────────────────
def salvar_html(empresa, html):
    slug = re.sub(r"[^a-z0-9]+", "-", empresa["nome"].lower()).strip("-")
    pasta = os.path.join(SITES_DIR, slug)
    os.makedirs(pasta, exist_ok=True)
    caminho = os.path.join(pasta, "index.html")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[LOCAL] Salvo em {caminho}")
    return caminho, slug

# ─── 5. DEPLOY VERCEL ────────────────────────────────────────────────────────
def deploy_vercel(slug, html):
    print(f"[VERCEL] Fazendo deploy: {slug}")
    payload = {
        "name": slug[:52],  # limite do Vercel
        "files": [
            {
                "file": "index.html",
                "data": html,
                "encoding": "utf-8",
            }
        ],
        "projectSettings": {
            "framework": None,
        },
	"deploymentProtection": "none",
    }
    headers = {
        "Authorization": f"Bearer {VERCEL_TOKEN}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        "https://api.vercel.com/v13/deployments",
        headers=headers,
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    url = f"https://{data['url']}"
    print(f"[VERCEL] Online em: {url}")
    return url

# ─── 6. ENVIAR WHATSAPP ──────────────────────────────────────────────────────
def enviar_whatsapp(telefone, nome, url_site):
    # normaliza telefone: só dígitos, sem +55
    numero = re.sub(r"\D", "", telefone)
    if numero.startswith("55"):
        numero = numero[2:]

    mensagem = f"""Olá! Tudo bem? 👋

Sou da Virtualizze, uma agência de automação digital.

Notamos que *{nome}* ainda não tem um site completo e criamos uma demonstração gratuita para vocês:

🔗 {url_site}

O site já está no ar! É só acessar e ver como ficaria a presença digital de vocês.

Posso entrar em contato para conversar sobre como podemos ajudar a crescer o negócio digitalmente?"""

    payload = {
        "number": f"55{numero}",
        "text": mensagem,
    }
    headers = {
        "apikey": EVOLUTION_KEY,
        "Content-Type": "application/json",
    }
    url = f"{EVOLUTION_URL}/message/sendText/{EVOLUTION_INST}"
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        resp.raise_for_status()
        print(f"[WHATS] Mensagem enviada para {numero}")
        return True
    except Exception as e:
        print(f"[WHATS] Erro ao enviar para {numero}: {e}")
        return False

# ─── 7. SALVAR RESULTADO CSV ─────────────────────────────────────────────────
def salvar_resultado(empresa, status, url_site=""):
    cabecalho = ["nome", "telefone", "website", "endereco", "status", "url_gerada", "data"]
    novo = not os.path.exists(RESULTS_CSV)
    with open(RESULTS_CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cabecalho)
        if novo:
            w.writeheader()
        w.writerow({
            "nome":       empresa["nome"],
            "telefone":   empresa["telefone"],
            "website":    empresa["website"],
            "endereco":   empresa["endereco"],
            "status":     status,
            "url_gerada": url_site,
            "data":       datetime.now().strftime("%Y-%m-%d %H:%M"),
        })

# ─── FLUXO PRINCIPAL ─────────────────────────────────────────────────────────
def processar_empresa(empresa):
    nome = empresa["nome"]
    print(f"\n{'='*50}")
    print(f"Processando: {nome}")

    # verifica site
    status_site = verificar_site(empresa["website"])
    print(f"[SITE] Status: {status_site}")

    if status_site == "site_real":
        print(f"[SKIP] {nome} já tem site real — descartando")
        salvar_resultado(empresa, "descartado_site_real")
        return

    if not empresa["telefone"]:
        print(f"[SKIP] {nome} sem telefone — descartando")
        salvar_resultado(empresa, "descartado_sem_telefone")
        return

    # gera site
    html = gerar_html(empresa)
    caminho, slug = salvar_html(empresa, html)

    # deploy
    try:
        url_site = deploy_vercel(slug, html)
    except Exception as e:
        print(f"[ERRO] Deploy falhou: {e}")
        salvar_resultado(empresa, "erro_deploy")
        return

    # envia whatsapp
    enviado = enviar_whatsapp(empresa["telefone"], nome, url_site)
    status_final = "enviado" if enviado else "deploy_ok_whats_falhou"
    salvar_resultado(empresa, status_final, url_site)

    # pausa entre empresas para não spammar
    time.sleep(10)

def main():
    os.makedirs(SITES_DIR, exist_ok=True)
    empresas = buscar_empresas(QUERY, LIMITE)
    for empresa in empresas:
        processar_empresa(empresa)
    print(f"\n[FIM] Resultados salvos em {RESULTS_CSV}")

if __name__ == "__main__":
    main()
