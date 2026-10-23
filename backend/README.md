# Backend Node.js + TypeScript

API, worker e agendador do Virtualizze Prospector executados no mesmo processo Node.js. O desenvolvimento local usa Node.js diretamente; produção usa Docker Compose.

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

O deploy automatizado na VPS está descrito em [deploy/README.md](../deploy/README.md). Os comandos abaixo continuam disponíveis para execução direta com Node.js.

```bash
npm install
npm run build
npm start
```

Para usar as integrações reais, configure as credenciais e defina `INTEGRATIONS_MODE=real`. Serper, OpenAI, Vercel e a chave da Evolution permanecem exclusivamente no `.env` do backend.

Os sites enviados à Vercel são publicados como produção e o sistema salva o alias público (`*.vercel.app`), não a URL protegida de preview. Se a conta estiver configurada para proteger **todos** os deploys, altere o projeto para `Settings > Deployment Protection > Standard Protection` ou `None`; a Vercel aplica essa política acima da API de publicação.

## Modo global de teste do WhatsApp

O modo pode ser alterado pela tela de configurações. Quando ativo, o destinatário é substituído no backend antes da chamada à Evolution API. A mensagem registra separadamente o telefone original, o número que recebeu o envio e se houve redirecionamento.

Também pode ser definido inicialmente no `.env`:

```env
WHATSAPP_TEST_MODE=true
WHATSAPP_TEST_NUMBER=5584999999999
```

Mudanças feitas pela interface ficam salvas no Supabase e são usadas nas próximas mensagens.

## WhatsApp — Evolution Go

O backend envia texto por `POST /send/text`, autentica com o header `apikey` e salva `data.Info.ID` como identificador da mensagem. Os nomes das variáveis continuam os mesmos: `EVOLUTION_URL` recebe a URL base da Go e `EVOLUTION_API_KEY` recebe a chave da instância (não a chave administrativa). `EVOLUTION_INSTANCE` permanece disponível por compatibilidade de configuração, mas não é exigida nem enviada na rota. O modo global de teste continua substituindo o destinatário antes da chamada ao provedor. Validação automatizada usa fetch simulado; envio real exige confirmar o número de teste no painel.
