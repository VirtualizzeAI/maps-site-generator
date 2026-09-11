# Backend

API e processamento Python do Virtualizze Prospector, preparados para deploy separado na VPS.

## Estrutura

```text
src/
├── api/             # rotas e dependências FastAPI
├── core/            # configuração e infraestrutura
├── repositories/   # persistência no Supabase
├── schemas/        # contratos de entrada e saída
├── services/       # regras de negócio
├── integrations/   # Serper, OpenAI, Vercel e Evolution
├── workers/        # tarefas assíncronas
└── scheduler/      # operações agendadas
```

## Estado atual

A primeira base funcional inclui FastAPI, endpoint de saúde, autenticação pelo token do Supabase, criação e consulta de operações, validação por organização, normalização para deduplicação, migration inicial, testes e Docker Compose com Redis.

O script anterior está em `legacy/prototype.py` apenas como referência. As integrações e os workers ainda serão migrados.

## Desenvolvimento

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.main:app --reload
```

## Testes

```bash
pytest
```

## Docker

```bash
docker compose up -d --build
```
