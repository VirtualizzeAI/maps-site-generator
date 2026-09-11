# Arquitetura do Virtualizze Prospector

## Deploy

- Frontend Next.js: Vercel, usando `frontend/` como diretório raiz.
- Backend FastAPI e worker: VPS via Docker Compose, usando `backend/` separadamente.
- Desenvolvimento atual: SQLite persistido em `backend/data/`.
- Produção futura: PostgreSQL do Supabase por meio de `DATABASE_URL`.

## Fluxo

1. O usuário cria ou agenda uma operação no painel.
2. O worker busca empresas pelo nicho e cidade.
3. Cada resultado é consolidado no histórico e recebe identidades normalizadas.
4. Empresas já prospectadas são bloqueadas antes da análise e do envio.
5. O analisador verifica telefone, site e sinais de presença digital.
6. Para empresas elegíveis, o sistema gera HTML e publica o site.
7. A mensagem recebe nome e URL do site.
8. No modo automático ela é enviada; no modo humano aguarda aprovação no painel.
9. Contadores, estados e eventos ficam persistidos para auditoria.

## Modos

- `INTEGRATIONS_MODE=mock`: fluxo local completo, sites locais e WhatsApp simulado.
- `INTEGRATIONS_MODE=real`: Serper, OpenAI, Vercel e Evolution API com credenciais configuradas.
