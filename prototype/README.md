# Prospector Virtualizze

Script de prospecção automática: busca empresas → verifica site → gera site com IA → publica no Vercel → envia WhatsApp.

## Instalação

```bash
pip install requests openai
```

## Configuração

Configure as variáveis de ambiente antes de executar:

```python
SERPER_API_KEY=...
OPENAI_API_KEY=...
VERCEL_TOKEN=...
EVOLUTION_URL=...
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE=...
```

Também ajuste a busca:
```python
QUERY  = "clínicas odontológicas Mossoró RN"
LIMITE = 10
```

## Uso

```bash
python main.py
```

## Resultados

Cada rodada gera/atualiza dois lugares:

- `./sites/nome-da-empresa/index.html` — HTML salvo localmente para edições futuras
- `./resultados.csv` — histórico de todas as empresas processadas

Status possíveis no CSV:
- `descartado_site_real` — empresa já tem site completo
- `descartado_sem_telefone` — sem telefone no Maps
- `erro_deploy` — falha no Vercel
- `deploy_ok_whats_falhou` — site no ar mas WhatsApp não enviou
- `enviado` — fluxo completo OK

## Para republicar um site editado

```python
# No Python interativo ou num script separado:
from main import deploy_vercel

with open("./sites/nome-da-empresa/index.html", "r") as f:
    html = f.read()

url = deploy_vercel("nome-da-empresa", html)
print(url)
```

## Cron (opcional)

Para rodar toda semana automaticamente, adicione ao crontab:

```
0 9 * * 1 cd /caminho/do/script && python main.py
```
