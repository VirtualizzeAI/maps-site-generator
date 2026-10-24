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

Os sites enviados à Vercel são publicados como produção. Para cada projeto de site gerado, o backend desativa Vercel Authentication com `PATCH /v9/projects/{id}` e `ssoProtection: null`. Antes de liberar o link, verifica o alias sem autenticação, cookies ou bypass e exige HTTP 200. Se a conta recusar a configuração ou o endereço continuar protegido/inacessível, a etapa falha e o link não segue para envio. Isso não altera a proteção do painel nem de outros projetos da conta.

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

## Prompt do agente de sites

Administradores podem editar o prompt em **Configurações → Prompt do agente de sites**, salvá-lo por organização ou restaurar o padrão. O campo aceita de 20 a 20.000 caracteres e as variáveis `{{empresa}}`, `{{segmento}}`, `{{cidade}}`, `{{endereco}}` e `{{whatsapp}}`.

O prompt é enviado como `instructions` na geração real; os dados da empresa também são enviados em `input`, mesmo sem variáveis. A saída continua sendo um documento HTML completo. O modo `mock` mantém seu template estático. Alterações valem para operações iniciadas após o salvamento e não modificam sites existentes.

A migration `202610230001_site_generation_prompt.sql` adiciona a coluna à tabela `integration_settings`; organizações sem personalização usam o prompt padrão do backend. Aplicar antes de implantar esta versão. A edição usa o endpoint de configurações existente, exige administrador da organização e gera auditoria.

## Edição de mensagens para aprovação

Administradores e operadores podem editar mensagens com status `pending_approval` em **Aprovações → Editar mensagem**. Salvar atualiza o texto da mensagem e o histórico da empresa, gera auditoria e mantém a aprovação pendente, sem chamar o WhatsApp. A aprovação posterior usa o texto salvo.

O endpoint `PATCH /api/v1/messages/:id` aceita `content` (1 a 4.000 caracteres, preservando parágrafos) e `expected_updated_at`, a versão recebida na listagem. Versões antigas retornam 409, assim como alterações durante envio ou em mensagens já enviadas. Registros arquivados não podem ser editados; destinatário e status não são alteráveis pelo endpoint. O mesmo bloqueio por mensagem protege edição e aprovação na instância única do backend. Não há migration adicional.

## Intervalo entre envios automáticos

Em **Configurações → Intervalo entre envios automáticos**, administradores definem de 0 a 3.600 segundos por organização. Zero mantém o envio assim que o próximo site estiver pronto. O intervalo é contado desde o último envio automático bem-sucedido, inclusive em outra operação; tempo de análise e geração já decorrido conta nesse período. Sem histórico, o primeiro envio não recebe espera adicional. Não há espera após o último envio nem no fluxo de aprovação humana.

Durante a espera, o andamento mostra a etapa correspondente. O worker aguarda fora da fila de mutações e reavalia a configuração a cada segundo, permitindo ajustar/desativar o intervalo enquanto a operação aguarda. A configuração usa `automatic_send_interval_seconds` no endpoint de integrações, com auditoria. Aplicar a migration `202610230002_automatic_send_interval.sql` antes desta versão; o padrão 0 preserva o comportamento anterior.

## Tokens e custo dos sites

Aplicar `supabase/migrations/202610240001_site_generation_usage.sql` antes do deploy. A geração grava `operation_companies.site_generation_usage` assim que a OpenAI responde, antes da validação do HTML/publicação/envio. Salva modelo efetivo, ID da resposta, tokens de entrada, leitura/gravação de cache, saída, raciocínio, total, estimativa USD e tarifas usadas. Falhas posteriores não apagam o consumo. Modo mock registra zero e identifica simulação.

O painel mostra consumo por site, totais da operação e acumulado da organização (incluindo arquivados). Histórico sem dados permanece sem registro; modelos/tarifas não suportados ou uso ausente não recebem custo inventado, e os totais parciais são sinalizados. Não há alteração retroativa de tarifas nem consultas pagas para reconstruir sites antigos. Falhas de rede ou respostas sem uso podem ter cobrança no provedor que o aplicativo não consegue atribuir; o painel não substitui a fatura.

Tarifas Standard verificadas em 24/10/2026 em [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [GPT-5 Mini](https://developers.openai.com/api/docs/models/gpt-5-mini), [GPT-5](https://developers.openai.com/api/docs/models/gpt-5) e [GPT-4.1 Mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini). O cálculo desconta cache da entrada comum, aplica gravação de cache e inclui raciocínio uma única vez na saída; GPT-6 aplica o multiplicador de contexto longo acima de 272.000 tokens de entrada. Requisições com service tier diferente de Standard não são precificadas. O gerador não solicita cache estendido. Somente custo OpenAI, sem câmbio, impostos, descontos de conta ou outros serviços. Manter a tabela em `src/site-usage.ts` atualizada para gerações futuras. Referência de cálculo: [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).
