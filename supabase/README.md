# Supabase

Projeto remoto: `guesnbuiqaazvmkgctjt`  
URL pública: `https://guesnbuiqaazvmkgctjt.supabase.co`

## Primeira configuração

1. Aplique, na ordem, os arquivos de `supabase/migrations/` usando o SQL Editor ou a CLI do Supabase.
2. Em **Authentication > Users**, crie o usuário `virtualizzeautomacao@gmail.com` com uma senha forte e confirmação automática habilitada.
3. O trigger da migration cria automaticamente:
   - o perfil do usuário;
   - a organização `Virtualizze Automação`;
   - a associação com função `admin`;
   - as configurações iniciais da organização.
4. Copie as variáveis do `.env.example` para o `.env` do backend e preencha as chaves apenas no ambiente local/servidor.

Se o usuário já existir quando a migration for aplicada, o bloco de bootstrap também o associa automaticamente.

## Segurança

- O frontend acessa somente a API do backend.
- RLS está habilitado em todas as tabelas públicas.
- `anon` e `authenticated` não recebem acesso direto às tabelas.
- A chave secreta do Supabase pertence exclusivamente ao backend.
- Chaves de OpenAI, Serper, Vercel e Evolution não são armazenadas nas tabelas.
- Nenhuma senha é inserida por migration.

## Variáveis do backend

```env
SUPABASE_URL=https://guesnbuiqaazvmkgctjt.supabase.co
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
DATABASE_SSL=true
```

Use a chave pública para login, a chave secreta somente para administrar usuários e `DATABASE_URL` para a persistência PostgreSQL do backend. Em ambientes IPv4, prefira a URL do **Session pooler** exibida em **Connect**.
