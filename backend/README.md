# Backend

Backend Python do Virtualizze Prospector. Esta pasta será implantada separadamente na VPS.

## Estado atual

O `main.py` preserva o protótipo sanitizado usado para validar a lógica de busca, geração, publicação e envio. Ele ainda não é a API de produção e continua usando CSV como armazenamento temporário.

A próxima fase substituirá o fluxo monolítico por:

- API FastAPI;
- workers e fila com Redis;
- agendador;
- Supabase como fonte de verdade;
- progresso em tempo real;
- deduplicação global e transacional;
- retentativas independentes por etapa.

## Execução do protótipo

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

As variáveis de `.env` precisam ser carregadas no ambiente antes da execução. Nenhuma credencial deve ser adicionada ao código.
