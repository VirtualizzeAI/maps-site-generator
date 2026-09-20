# Frontend

Interface Next.js do Virtualizze Prospector, organizada em `src/` por responsabilidade e domínio.

```text
src/
├── app/          # rotas e layouts Next.js
├── components/   # componentes visuais reutilizáveis
├── features/     # funcionalidades do produto
├── services/     # clientes compartilhados
├── lib/          # utilitários
└── styles/       # estilos globais e vendor
```

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

O navegador usa o token de autenticação emitido pela API Fastify e chama o backend Node.js pela URL configurada em `NEXT_PUBLIC_API_URL`. Nesta fase, o frontend não acessa Supabase nem qualquer banco diretamente.
