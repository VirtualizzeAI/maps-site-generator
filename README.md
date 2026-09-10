# Maps Site Generator

Sistema da Virtualizze para buscar empresas, analisar presença digital, gerar sites com GPT, publicar na Vercel e realizar a prospecção pelo WhatsApp.

## Estrutura do repositório

```text
maps-site-generator/
├── frontend/   # Interface Next.js — deploy na Vercel
├── backend/    # Python, workers e integrações — deploy na VPS
└── docs/       # Arquitetura e decisões do projeto
```

Frontend e backend possuem dependências, variáveis de ambiente e instruções próprias. Eles podem ser implantados de forma independente.

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
python main.py
```

O código Python atual ainda é o protótipo da lógica. A API, as filas, o scheduler e a integração com Supabase serão implementados na próxima fase.

Para baixar somente o backend na VPS:

```bash
git clone --filter=blob:none --sparse https://github.com/VirtualizzeAI/maps-site-generator.git
cd maps-site-generator
git sparse-checkout set backend docs
```

## Arquitetura definida

- interface Next.js na Vercel;
- backend e workers Python na VPS;
- Supabase Auth, PostgreSQL, Realtime e Storage;
- Vercel para publicação dos sites gerados;
- Evolution API para o WhatsApp;
- deduplicação global para impedir uma segunda prospecção da mesma empresa.

Consulte [`docs/architecture.md`](docs/architecture.md) para os detalhes.

## Segurança

Nunca envie arquivos `.env`, chaves de API ou tokens ao repositório. As credenciais encontradas no protótipo original devem ser consideradas comprometidas e substituídas.
