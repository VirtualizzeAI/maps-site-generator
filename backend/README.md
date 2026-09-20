# Backend Node.js + TypeScript

API, worker e agendador do Virtualizze Prospector executados no mesmo processo Node.js. Não utiliza Python nem Docker.

## Desenvolvimento local

```bash
copy .env.example .env
npm install
npm run dev
```

A API fica em `http://localhost:8000` e a documentação de saúde em `http://localhost:8000/health`.

O modo padrão `mock` executa o fluxo completo sem consumir APIs: busca empresas simuladas, analisa, gera sites, publica em `/generated/` e simula o WhatsApp. Os dados são persistidos em `data/database.json`.

## Produção

```bash
npm install
npm run build
npm start
```

Para usar as integrações reais, configure as credenciais e defina `INTEGRATIONS_MODE=real`. A camada de armazenamento local será substituída pelo Supabase depois dos testes.

Os sites enviados à Vercel são publicados como produção e o sistema salva o alias público (`*.vercel.app`), não a URL protegida de preview. Se a conta estiver configurada para proteger **todos** os deploys, altere o projeto para `Settings > Deployment Protection > Standard Protection` ou `None`; a Vercel aplica essa política acima da API de publicação.

## Modo global de teste do WhatsApp

O modo pode ser alterado pela tela de configurações. Quando ativo, o destinatário é substituído no backend antes da chamada à Evolution API. A mensagem registra separadamente o telefone original, o número que recebeu o envio e se houve redirecionamento.

Também pode ser definido inicialmente no `.env`:

```env
WHATSAPP_TEST_MODE=true
WHATSAPP_TEST_NUMBER=5584999999999
```

Mudanças feitas pela interface ficam salvas no banco local e são usadas nas próximas mensagens.
