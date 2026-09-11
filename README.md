# Maps Site Generator

Sistema da Virtualizze para buscar empresas, analisar presença digital, gerar sites com IA, publicar na Vercel e realizar a prospecção pelo WhatsApp.

## Estrutura

```text
maps-site-generator/
├── frontend/   # Next.js — deploy na Vercel
├── backend/    # FastAPI, workers e integrações — deploy na VPS
└── docs/       # arquitetura e padrões
```

Frontend e backend possuem dependências, variáveis de ambiente e deploys independentes.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Na Vercel, configure `frontend` como **Root Directory**.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.main:app --reload
```

Na VPS:

```bash
docker compose up -d --build
```

## Estado do desenvolvimento

Já disponível:

- painel Next.js reorganizado em `frontend/src/`;
- cliente HTTP e contratos iniciais de operações;
- API FastAPI;
- autenticação por token Supabase;
- criação e consulta de operações;
- estrutura multiusuário por organização;
- migration inicial do banco;
- normalização de empresas para deduplicação;
- Docker Compose com API e Redis.

Próximas etapas:

- aplicar e validar a migration no projeto Supabase;
- implementar busca e análise digital como workers;
- migrar as integrações Serper, OpenAI, Vercel e Evolution;
- ligar os dados reais ao painel;
- implementar agendamento e aprovação humana.

Consulte [`docs/architecture.md`](docs/architecture.md) e [`docs/project-standards.md`](docs/project-standards.md).

## Segurança

Nunca envie arquivos `.env`, chaves de API ou tokens ao repositório. As credenciais encontradas no protótipo original devem ser consideradas comprometidas e substituídas.
