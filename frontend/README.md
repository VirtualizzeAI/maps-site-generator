# Frontend

Interface Next.js do Virtualizze Prospector.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Defina **Root Directory** como `frontend`.
3. Cadastre as variáveis de `.env.example`.
4. Use o framework Next.js e publique.

O navegador usa Supabase Auth/Realtime e chama a API Python pela URL configurada em `NEXT_PUBLIC_API_URL`.
