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
3. Use o framework **Next.js** e mantenha o diretório de saída padrão do framework.
4. Cadastre `NEXT_PUBLIC_API_URL` em **Settings → Environment Variables**, no ambiente **Production**, com a URL HTTPS pública do backend. Exemplo: `https://api.seudominio.com` (substitua pelo domínio real, sem `/api/v1`). Para deploys de Preview, configure também essa variável no ambiente **Preview**, apontando para o backend adequado.
5. Publique. O arquivo `vercel.json` executa lint e build em cada deploy.

O build na Vercel recusa uma URL ausente, inválida, sem HTTPS ou de loopback. A variável é pública: nunca inclua tokens, senhas ou chaves nela. Alterações em `NEXT_PUBLIC_API_URL` exigem novo deploy, pois o Next.js incorpora o valor ao JavaScript durante o build.

### Preparar o backend

O backend precisa estar acessível publicamente por HTTPS e conectado ao Supabase. Um backend disponível apenas em `localhost:8000` não atende o painel publicado.

No ambiente do backend, configure:

```env
FRONTEND_URL=https://seu-painel.vercel.app
PUBLIC_API_URL=https://api.seudominio.com
```

Substitua pelos domínios reais. `FRONTEND_URL` deve corresponder exatamente à origem do painel, sem barra final ou caminho, para liberar o CORS. Reinicie o backend após alterar seu ambiente. A configuração atual permite uma origem por vez; para testar Preview, use um backend com `FRONTEND_URL` correspondente à origem desse Preview.

Mantenha `DATABASE_URL`, as chaves do Supabase e as credenciais das integrações exclusivamente no backend.

### Validar após publicar

1. Abra `https://api.seudominio.com/health` e confirme a resposta de saúde do backend.
2. Abra o domínio do painel, faça login e confira o carregamento de empresas e operações.
3. Acesse diretamente uma rota como `/operations/<id existente>` e recarregue a página para confirmar sua abertura.
4. Se houver erro de rede, confira no navegador a URL da API, HTTPS e a origem permitida pelo CORS do backend.

Referências: [projetos em monorepositórios na Vercel](https://vercel.com/docs/monorepos) e [variáveis de ambiente do Next.js](https://nextjs.org/docs/app/guides/environment-variables).

O navegador usa o token de autenticação emitido pela API Fastify e chama o backend Node.js pela URL configurada em `NEXT_PUBLIC_API_URL`. Nesta fase, o frontend não acessa Supabase nem qualquer banco diretamente.
