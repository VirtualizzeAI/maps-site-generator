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

## Cancelamento de envios pendentes

Administradores e operadores podem usar **Aprovações → Cancelar envio**, com confirmação e aviso de resultado. `POST /api/v1/messages/:id/cancel` cancela somente mensagens `pending_approval` da organização, preserva conteúdo/site e gera auditoria `message_cancelled`. Mensagem e vínculo passam a `cancelled`; o item sai da fila e aparece como envio cancelado nos descartados da operação. Não chama Evolution nem marca a empresa como contatada. Canceladas não podem ser editadas ou aprovadas.

O cancelamento compartilha o bloqueio por mensagem com edição/aprovação e é revalidado dentro da gravação. Última pendência conclui somente operações em `awaiting_approval`, sem encerrar processamento ainda ativo. Aplicar `202611160001_cancel_pending_messages.sql` antes do backend para permitir o novo status; nenhum histórico é removido.

## Operações avançadas

Na criação de operações, `analysis_mode` aceita `standard` (padrão, inclusive para clientes antigos) ou `advanced`. `analysis_model` permite `gpt-6-luna`, `gpt-6.1-sol` (padrão avançado) ou `gpt-6-astra`; no modo padrão fica nulo. O modelo é salvo por operação e vale só para a análise, mantendo o modelo de geração de sites nas Configurações. Aplicar `202611170001_advanced_analysis.sql` antes do backend. Operações existentes recebem `standard` sem mudar o fluxo anterior. Deduplicação continua global entre os dois tipos.

A análise avançada usa Responses API + `web_search`, com a mesma chave OpenAI do backend, localização brasileira, até 3 chamadas de ferramentas, 6.000 tokens de saída e timeout de 120 segundos por empresa. Não há repetição paga automática ou fallback para análise padrão em erros. Busca nome/cidade/telefone, compara identidade e diferencia site oficial, diretório e rede social. O backend exige pesquisa concluída, fontes consultadas e correspondência de telefone ou endereço com número, além de confiança informada pelo modelo de pelo menos 80. URLs oficiais sem fonte, conflitos com site do Maps, respostas inválidas, baixa confiança e erros ficam em `analysis_inconclusive`, sem gerar nem enviar. Isso é uma classificação assistida por IA, não comprovação absoluta de ausência de site.

Resultados, justificativas, confiança, sites, fontes e custo ficam em `operation_companies.advanced_analysis` e no histórico da empresa. O detalhe da operação apresenta inconclusivos em seção própria para conferência; as ações manuais por empresa descritas abaixo permitem decidir a geração após a conferência. Sites oficiais identificados são descartados para nova geração. Na operação avançada, empresas elegíveis aguardam escolha por empresa antes de gerar; intervalo e aprovação humana/automática continuam valendo para a abordagem. Sem telefone, mantém o descarte anterior sem chamada paga. Modo mock simula sem serviços pagos.

Uso é salvo antes da interpretação da resposta, preservando gasto em falhas posteriores. Custos da pesquisa/análise aparecem separados da geração do site, por empresa/operação e no acumulado da organização, incluindo arquivados. Estimativa Standard: tokens via tabela congelada e US$ 0,01 por `web_search_call` retornado; uso indisponível é sinalizado como parcial, nunca inventado. Falhas de transporte podem ter cobrança não atribuível localmente. Preços Luna/Sol/Astra e busca verificados em 17/11/2026 em [preços oficiais](https://developers.openai.com/api/docs/pricing); funcionalidades em [busca web](https://developers.openai.com/api/docs/guides/tools-web-search). Atualizações de tarifa valem apenas para novos registros.

## Ações manuais após análise avançada

Aplicar `202611180001_manual_site_actions.sql` antes desta versão. `POST /api/v1/operation-companies/:id/site-action` aceita `{action:"site_only"}` ou `{action:"site_and_outreach"}`, exige administrador/operador da organização e enfileira o pedido; o endpoint não executa geração/envio na requisição HTTP. Permissões e disponibilidade por empresa são retornadas no detalhe da operação. Só aceita operação já processada e vínculos `analysis_ready`, `analysis_inconclusive`, `discarded_site_real` ou `site_created`, sem contato/mensagem anterior ou processamento conflitante no histórico. Empresa sem telefone válido pode receber apenas site, quando tiver análise disponível. Não há repetição de ações concluídas/em andamento nem liberação para bloqueados pelo histórico, enviados ou cancelados.

Worker único prioriza a fila manual persistida, registra autor/pedido e reutiliza a mesma geração/publicação e política de abordagem do fluxo anterior. `site_only` não cria mensagem e termina em `site_created`; a abordagem posterior reaproveita a URL sem nova geração/custo. `site_and_outreach` respeita `human_review` ou `automatic`, modo de teste e intervalo; não altera o destinatário salvo. Escolher ação manual pode superar o resultado da IA (incluindo site próprio identificado), mas preserva análise e deduplicação, com auditoria. Aprovações paralelas não concluem uma operação que ainda gera sites. URL e uso são persistidos antes da mensagem, inclusive se o provedor de envio falhar. Falhas não são repetidas automaticamente, pois um envio pode ter resultado ambíguo. Se o processo cair após iniciar a geração/envio, o registro exige conferência, sem repetição automática.
## Prospecção web

O módulo independente usa OpenAI Responses + `web_search` para descobrir empresas por nicho/cidade e pesquisar dados públicos. Não usa Maps/Serper, não gera sites e não envia mensagens. Usa a chave OpenAI já configurada, sem novas variáveis de ambiente.

- `POST /api/v1/prospecting/operations`: organização, nicho, cidade, quantidade de 1 a 30, `collect_linkedin`, `collect_contacts` (ao menos um verdadeiro) e modelo existente. Administradores/operadores.
- `GET /api/v1/prospecting/operations?organization_id=...`: histórico e totais.
- `GET /api/v1/prospecting/operations/:id`: resultados, relatório, fontes e consumo. Leitura por membros da própria organização.

Aplique `supabase/migrations/202611220001_web_prospecting.sql` antes de atualizar o backend. Dados ficam em `prospecting_operations` e `prospecting_results`, com RLS e acesso pelo backend. O worker único compartilha a fila com as operações de sites por ordem de criação. Repetições são removidas dentro da pesquisa, sem alterar o histórico de deduplicação/abordagem dos sites.

Cada requisição limita ferramentas a 6 chamadas, saída a 10.000 tokens e duração a 180 segundos. Consumo da descoberta e de cada empresa é salvo antes de interpretar a resposta. Falhas preservam custos já registrados; não há repetição automática nem retomada de pesquisas interrompidas por reinício. Modo mock mantém o mesmo contrato com zero consumo. Perfis/contatos exigem URLs nas fontes retornadas pela ferramenta; vínculo/cargo incerto fica identificado e dados não encontrados ficam vazios.

## CRM da prospecção web

Aplicar `202611220002_prospecting_crm.sql` antes do backend. Prefixo `/api/v1/prospecting/crm`:

- `GET/POST /boards`, `GET/PATCH/DELETE /boards/:id`: listar/criar/detalhar/renomear/excluir quadros. POST recebe `organization_id` e `name`; cria quatro etapas editáveis. GET list exige organização na query e inclui etapas/contadores.
- `POST /boards/:id/stages`, `PATCH/DELETE /stages/:id`: criar, editar nome/posição e excluir etapas. DELETE de etapa ocupada exige `destination_stage_id` do mesmo quadro, transferindo cartões antes de ocultar a etapa.
- `POST /cards`: recebe `board_id`, `stage_id`, `result_id`; organização e identidade são resolvidas no servidor. Bloqueia empresa ativa repetida por quadro, mesmo vinda de outra pesquisa com a mesma chave nome/cidade.
- `PATCH /cards/:id`: recebe `stage_id` e `expected_stage_id`; recusa conflitos de movimentação. `DELETE /cards/:id` remove do quadro preservando a pesquisa.

Leitura por membros; alterações por administradores/operadores. Validação de organização e estado é repetida dentro da gravação serializada. Quadros, etapas e cartões têm exclusão lógica, referências compostas por organização e auditoria. Detalhe do quadro incorpora os resultados/relatórios originais e suas opções de pesquisa; não chama integrações de pesquisa, geração ou WhatsApp. RLS bloqueia acesso direto do navegador.
