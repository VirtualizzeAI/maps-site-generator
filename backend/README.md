# Backend Node.js + TypeScript

API, worker e agendador do Virtualizze Prospector executados no mesmo processo Node.js. Desenvolvimento local com Node.js diretamente e produção na VPS com Docker.

## Desenvolvimento local

```bash
copy .env.example .env
npm install
npm run dev
```

A API fica em `http://localhost:8000` e a documentação de saúde em `http://localhost:8000/health`.

O modo padrão `mock` executa o fluxo completo sem consumir APIs: busca empresas simuladas, analisa, gera sites, publica em `/generated/` e simula o WhatsApp. Os dados são persistidos no PostgreSQL do Supabase.

Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `DATABASE_URL`. Para desenvolvimento local e VPS IPv4, use preferencialmente a conexão **Session pooler** mostrada em **Connect** no painel do Supabase.

## Produção

```bash
npm install
npm run build
npm start
```

Para usar as integrações reais, configure as credenciais e defina `INTEGRATIONS_MODE=real`. Serper, OpenAI, Vercel e a chave da Evolution permanecem exclusivamente no `.env` do backend.

Os sites enviados à Vercel são publicados como produção e o sistema salva o alias público (`*.vercel.app`), não a URL protegida de preview. Se a conta estiver configurada para proteger **todos** os deploys, altere o projeto para `Settings > Deployment Protection > Standard Protection` ou `None`; a Vercel aplica essa política acima da API de publicação.

## Modo global de teste do WhatsApp

O envio real usa Evolution Go: `EVOLUTION_URL` é a URL base e `EVOLUTION_API_KEY` aceita a chave da instância ou a chave administrativa. Com a chave administrativa, informe o nome exato da instância no painel ou em `EVOLUTION_INSTANCE`. Após uma recusa de autenticação (401), o backend resolve o token por `GET /instance/all` e envia por `POST /send/text` usando somente a instância escolhida. Com uma chave de instância, o nome é opcional. Não há repetição automática após falhas ambíguas de envio. Chaves e tokens nunca são retornados pela API.

A aprovação usa o texto já salvo; o corpo `{}` é válido. Falhas conhecidas da Go são apresentadas no painel, sem expor a resposta do provedor, e o botão permite nova tentativa. Aprovações concorrentes da mesma mensagem são bloqueadas na única instância do backend.

O modo pode ser alterado pela tela de configurações. Quando ativo, o destinatário é substituído no backend antes da chamada à Evolution API. A mensagem registra separadamente o telefone original, o número que recebeu o envio e se houve redirecionamento.

Também pode ser definido inicialmente no `.env`:

```env
WHATSAPP_TEST_MODE=true
WHATSAPP_TEST_NUMBER=5584999999999
```

Mudanças feitas pela interface ficam salvas no Supabase e são usadas nas próximas mensagens.
