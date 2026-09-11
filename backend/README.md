# Backend

API FastAPI e worker persistente do Virtualizze Prospector, preparados para deploy separado na VPS.

## Responsabilidades

- autenticação local e organizações;
- operações imediatas e agendadas;
- SQLite local, substituível por PostgreSQL/Supabase;
- histórico e deduplicação de empresas;
- busca, análise, geração de site, deploy e WhatsApp;
- aprovação humana e auditoria de estados.

## Processos

```bash
uvicorn src.main:app --reload
python -m src.workers.runner
```

Para processar somente uma operação e encerrar: `python -m src.workers.runner --once`.

O Docker Compose inicia API e worker com o mesmo volume `./data`. Consulte `.env.example` para alternar entre integrações simuladas e reais.
