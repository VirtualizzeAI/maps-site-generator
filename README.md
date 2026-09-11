# Maps Site Generator

Sistema da Virtualizze para buscar empresas, analisar presença digital, gerar e publicar sites e fazer prospecção pelo WhatsApp.

## Estrutura

```text
maps-site-generator/
├── frontend/   # Next.js — deploy independente na Vercel
├── backend/    # FastAPI + worker — deploy independente na VPS
└── docs/       # arquitetura e padrões reutilizáveis
```

## Executar o MVP local

O modo padrão é `mock`: o fluxo completo funciona sem chaves externas, usa SQLite, gera sites locais e simula o envio do WhatsApp.

Backend e worker:

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Frontend, em outro terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Acesse `http://localhost:3000` com `admin@virtualizze.com` / `admin123`. Troque a senha no `.env` antes de qualquer publicação.

Sem Docker, instale `backend/requirements.txt` e execute em terminais separados:

```bash
uvicorn src.main:app --reload
python -m src.workers.runner
```

## Fluxos disponíveis

- login local persistente;
- operação manual ou agendada;
- envio automático ou com aprovação humana;
- busca, análise digital, geração de site, publicação e envio simulados;
- painel atualizado a cada três segundos;
- histórico consolidado de empresas e bloqueio de nova prospecção;
- configuração de Serper, OpenAI, Vercel e Evolution API;
- troca futura para Supabase PostgreSQL por `DATABASE_URL`.

Veja [a arquitetura](docs/architecture.md) e [os padrões do projeto](docs/project-standards.md).

## Produção

Configure `INTEGRATIONS_MODE=real`, as credenciais externas e uma senha administrativa forte. Na Vercel, use `frontend/` como Root Directory e a URL pública da API em `NEXT_PUBLIC_API_URL`.
