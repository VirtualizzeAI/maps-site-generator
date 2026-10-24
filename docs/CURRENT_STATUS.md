# Estado atual do Maps Site Generator

Última revisão: 24 de outubro de 2026.

## Tokens e custo da geração de sites

- Cada nova geração registra o modelo efetivo e os tokens retornados pela OpenAI (entrada, leitura/gravação de cache, saída, raciocínio e total), com estimativa em USD e tarifas congeladas. Contagem de raciocínio/cache não é duplicada no custo. Modo mock registra simulação com zero consumo/custo.
- Consumo é salvo e auditado antes de validar HTML/publicar/enviar; falhas posteriores preservam o gasto. Detalhe da operação e histórico da empresa exibem valores por site; operação mostra total próprio e visão geral exibe acumulado da organização, incluindo arquivados e falhas com consumo registrado.
- Histórico anterior permanece sem registro. Uso ausente, modelos sem tarifa conhecida ou service tiers não suportados sinalizam totais parciais; não há custo inventado. Estimativa somente OpenAI, não equivale à fatura e não inclui outros provedores, impostos, descontos ou câmbio. Tarifas Standard verificadas em 24/10/2026; revisão para futuras mudanças no provedor é manual, sem recalcular histórico.
- Migration `202610240001_site_generation_usage.sql` aplicada antes do backend. Validação: 57 testes e build do backend; lint/build do frontend; navegador desktop/mobile para acumulado, precisão USD, site, histórico e perfil visualizador; API em organizações temporárias verificou gravação pelo store/recarga JSONB, tarifas, totais, falhas/arquivados, histórico, autenticação e isolamento. Fixtures removidas. Nenhuma geração paga ou mensagem real foi disparada.

## Intervalo entre envios totalmente automáticos

- Configurações inclui intervalo de 0 a 3.600 segundos, persistido por organização e editável somente por administradores. O padrão 0 desativa a espera.
- Worker respeita o tempo mínimo desde o último envio automático bem-sucedido da organização, inclusive entre operações. Geração de sites conta no tempo decorrido. Aprovação humana não é atrasada; primeiro envio sem histórico e fim da operação não recebem espera extra.
- Espera fica fora da fila de gravação, com etapa visível e evento de auditoria. Ajustes do intervalo são reavaliados a cada segundo antes do próximo envio.
- Migration `202610230002_automatic_send_interval.sql` aplicada ao banco antes do deploy. Validação: 48 testes e build do backend; lint/build do frontend; navegador para configuração, validação, erro/nova tentativa e mobile; API com persistência, limites e permissões em organizações temporárias. Temporização do pipeline validada com relógio simulado, sem disparar operações ou mensagens reais.

## Edição das mensagens pendentes de aprovação

- Aprovações inclui editor por mensagem com salvamento, cancelamento, contador de caracteres e preservação de parágrafos. Salvar não envia; a aprovação usa o texto já salvo. O rascunho é preservado durante polling e falhas de gravação.
- Administradores e operadores podem editar; visualizadores não podem editar/aprovar. Backend valida organização, estado pendente, versão e limite de 4.000 caracteres, sincroniza o histórico e gera auditoria. Edição/aprovação compartilham bloqueio por mensagem para evitar alteração durante envio.
- Conflitos mostram orientação para recarregar o texto; uma mensagem removida da fila por outro operador não bloqueia as demais ações. Não há alteração de schema do banco.
- Validação: 40 testes e build do backend, lint/build do frontend; fluxo de API em organizações temporárias validou persistência, permissões, estados, conflitos, auditoria e aprovação do texto editado contra provedor simulado. Fixtures removidas e nenhum envio WhatsApp real realizado.
- Navegador validou cancelamento, preservação do rascunho em polling/erro, salvamento separado, conflitos, aprovação, remoção concorrente da fila, visualização sem permissão de edição e layout mobile.

## Confirmações visuais das ações

- Modal global de sucesso/erro nas ações de login, criação de usuários, salvamento das configurações/prompt, criação/agendamento de operações, aprovação de mensagens e arquivamento de empresas/operações, incluindo o detalhe da operação.
- Ícones e cores distinguem o resultado; o modal pode ser fechado por Entendi, botão de fechar ou Escape. Mantém foco de teclado e permanece disponível durante mudanças de rota. Notificações simultâneas são apresentadas em fila.
- Arquivamentos em lote informam a quantidade concluída quando ocorre uma falha parcial. Atualizações automáticas e navegação não geram modais.
- Validação: lint/build do frontend e testes no navegador dos resultados das ações, tentativa após falha, foco/teclado, navegação, arquivamento parcial, ausência de modais em polling e layout mobile. Requisições dos testes foram simuladas; nenhuma mensagem ou alteração de dados operacionais foi executada.

## Prompt editável do agente de sites

- Configurações inclui editor de prompt, variáveis da empresa, contador de caracteres e restauração do padrão. Somente administradores podem salvar; o prompt é persistido por organização.
- Geração real usa as instruções salvas e continua recebendo os dados da empresa separadamente e exigindo HTML completo. Operações iniciadas após o salvamento usam a nova configuração; sites já publicados não são alterados. Modo mock continua com template estático.
- Migration `202610230001_site_generation_prompt.sql` adiciona o campo à tabela `integration_settings`, preservando o padrão para organizações sem personalização. Aplicada ao banco de produção antes do deploy do backend.
- Validação: 35 testes e build do backend, lint/build do frontend e testes no navegador de edição, salvamento, restauração e restrição por perfil. Não foram necessárias gerações pagas nem envios de WhatsApp.
- API de produção validada em organizações temporárias: persistência e recarga do prompt, uso pelo gerador, isolamento entre organizações, restrição por perfil, limites e restauração. Fixtures removidas ao final.

## Sites demonstrativos públicos

- Cada novo projeto de site gerado recebe `ssoProtection: null` pela API da Vercel. O backend verifica o alias anonimamente antes de concluir a publicação; falhas de permissão ou acesso impedem liberar o link para envio.
- A alteração é restrita ao projeto gerado e não modifica as configurações globais da conta ou a proteção do painel.
- Validação automatizada: 29 testes e build do backend, incluindo recusa da alteração de proteção e redirecionamento para login.
- Validação real: site estático temporário publicado na conta Vercel; HTTP 200 e HTML esperado confirmados anonimamente, sem login. Projeto temporário removido após o teste.

## Correção da aprovação e seleção da Evolution Go

- A chave administrativa agora é resolvida para o token da instância exata escolhida no painel ou no ambiente, após recusa de autenticação no envio direto. Chaves de instância continuam funcionando diretamente. Configurar o nome passa a selecionar a conexão quando a chave é administrativa.
- Aprovação com corpo `{}` usa o conteúdo salvo. Erros conhecidos da Go aparecem no painel e o botão é liberado após falha. Aprovações simultâneas da mesma mensagem são bloqueadas no processo único.
- Validação: 27 testes e build do backend; lint/build do frontend; aprovação completa contra provedor simulado com persistência, redirecionamento de teste e bloqueio de duplicação. A instância real selecionada autenticou e respondeu conectada em consulta somente leitura. Nenhuma mensagem real foi enviada na validação.

## Produção e administração — atualização de 23/10

- Backend publicado na VPS com Docker, HTTPS em `https://apimsg.virtualizzeautomacao.com.br`, Supabase e Evolution Go (`POST /send/text`). Ambiente protegido em `/opt/stacks/maps-site-generator/backend.env`. Deploy manual, sem atualização automática ativada.
- Cadastro de usuários normaliza nome/e-mail, valida limites do banco, retorna conflito para e-mail duplicado e mantém autorização administrativa. A interface apresenta erro/sucesso e libera o botão após falha.
- Configurações exibem a URL efetiva da Evolution Go, incluindo fallback do ambiente. A chave continua exclusivamente no servidor; o nome da instância é opcional. O indicador de configuração não confirma conexão do WhatsApp.
- A gravação valida URL, preserva o número de teste em alterações parciais, recusa número vazio com teste ativo e gera auditoria. Operadores/visualizadores não podem criar usuários ou alterar integrações.
- Validação: 24 testes e build do backend; lint e build do frontend. Na API publicada, foram validados criação/login de usuário, permissões, conflito, persistência de configurações e auditoria usando organização e contas temporárias, removidas ao final. Nenhuma mensagem foi enviada.

Esta seção atualiza os itens antigos de deploy e Evolution API abaixo.

Este documento é o ponto de retomada para novas sessões de desenvolvimento. Antes de implementar algo, confirme o estado real do código e o histórico do Git.

## Objetivo do produto

Automatizar a prospecção de empresas encontradas no Google Maps: pesquisar, analisar presença digital, evitar contatos repetidos, gerar um site demonstrativo, publicar um link público e abordar a empresa pelo WhatsApp.

## Arquitetura atual

```text
maps-site-generator/
├── frontend/   # Next.js + React + TypeScript
├── backend/    # Fastify + TypeScript
└── docs/       # arquitetura, padrões e estado do projeto
```

- Frontend e backend possuem dependências e execução independentes.
- Não há Python ou Docker.
- API, worker e agendador rodam no mesmo processo do backend.
- A persistência em execução usa PostgreSQL no projeto Supabase `guesnbuiqaazvmkgctjt`.
- A migration inicial está versionada em `supabase/migrations/`.
- Sites gerados também são mantidos localmente em `backend/data/sites/`.
- O frontend nunca acessa o banco diretamente.

## Funcionalidades implementadas

### Acesso e administração

- Login, renovação de sessão e criação de usuários com Supabase Auth.
- Organizações, membros e perfis `admin`, `operator` e `viewer`.
- Cadastro de usuários pelo painel.
- Autorização validada no backend.

### Operações

- Criação manual ou agendada por nicho, cidade e quantidade.
- Modos de envio automático ou com aprovação humana.
- Worker interno e acompanhamento do estágio atual.
- Página `/operations/[id]` atualizada por polling.
- Kanban sem duplicação de cards, organizado em cinco etapas:
  - lista de empresas;
  - criando site;
  - aguardando aprovação humana;
  - enviado;
  - descartado.
- O menu lateral pode ser recolhido no desktop e mantém a preferência entre páginas e recarregamentos.
- Contadores, progresso, empresa atual, links e mensagens.

### Empresas e histórico

- Nome, endereço, telefone principal e adicionais.
- E-mail, site original, Google Maps e redes sociais.
- Data e hora da primeira pesquisa.
- Operações em que a empresa apareceu.
- Link do site gerado em cada operação.
- Identidades normalizadas para deduplicação por origem, telefone, domínio e nome/endereço.
- Bloqueio de empresas já registradas em operações anteriores.

### Arquivamento

- Administradores podem arquivar empresas e operações.
- Na tela de empresas, administradores podem selecionar uma ou todas as empresas visíveis e arquivá-las em lote.
- O item arquivado deixa de aparecer no painel.
- A identidade permanece no histórico e continua impedindo nova prospecção.
- A interface atualiza os dados sem recarregar a página ou trocar a aba selecionada.

### Integrações

- `mock`: simula pesquisa, análise, site, publicação e mensagem sem serviços pagos.
- `real`:
  - Serper para Google Maps;
  - OpenAI para gerar o HTML;
  - Vercel para publicação;
  - Evolution API para WhatsApp.
- As chaves secretas vêm exclusivamente do `.env` do backend; apenas opções não secretas ficam no banco.

### Segurança do teste de WhatsApp

- Toggle global de modo de teste.
- Número global de teste.
- Substituição do destinatário feita no backend.
- Registro separado do telefone original e do destinatário efetivo.
- Aviso visível no painel e na fila de aprovação.

### Publicação na Vercel

- O painel Next.js está preparado para um projeto Vercel com Root Directory `frontend`; `frontend/vercel.json` executa lint e build.
- O deploy do painel exige `NEXT_PUBLIC_API_URL` com a URL HTTPS pública do backend; o build na Vercel recusa configuração ausente, inválida ou de loopback.
- O procedimento de deploy, CORS e verificação está em `frontend/README.md`. A publicação e a validação integrada dependem dos domínios reais do painel e da API e do backend acessível com Supabase funcionando.
- O backend cria deploy com `target: "production"`.
- Aguarda o deploy chegar a `READY`.
- Salva o alias público `*.vercel.app`, não a URL protegida de preview.
- Se a conta usar proteção em todos os deploys, a política precisa ser alterada na própria Vercel.

## Fluxo real já validado

Já foi validado localmente, usando credenciais reais:

1. pesquisa de empresas;
2. análise e deduplicação;
3. geração dos sites;
4. publicação na Vercel;
5. criação de mensagens;
6. envio para a fila de aprovação.

Após os ajustes recentes, ainda deve ser repetido um teste controlado para confirmar em conjunto:

- abertura pública do novo domínio da Vercel em janela anônima;
- aprovação de uma mensagem;
- redirecionamento efetivo para o número global de teste;
- resposta e identificador retornados pela Evolution API.

## Correções recentes relevantes

- CORS permite `PUT`, `PATCH`, `DELETE` e `OPTIONS`.
- Requisições sem corpo não enviam `Content-Type: application/json`.
- Arquivamentos não usam mais recarregamento completo da página.
- Deploys da Vercel são de produção e retornam domínio público.
- Kanban e histórico enriquecido de empresas foram adicionados.

## Como executar

Backend:

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

Frontend, em outro terminal:

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Endereços:

- painel: `http://localhost:3000`;
- API: `http://localhost:8000`;
- saúde: `http://localhost:8000/health`.

O acesso usa o administrador criado no Supabase Auth.

## Como validar

```powershell
cd backend
npm test
npm run build

cd ..\frontend
npm run lint
npm run build
```

## Limitações e riscos atuais

- O cache de persistência, a API, o worker e o agendador permanecem no mesmo processo; por isso o MVP deve rodar em apenas uma instância do backend.
- Ainda não há fila distribuída nem alta disponibilidade.
- Retentativas, idempotência e recuperação de falhas externas ainda precisam ser fortalecidas.
- A estratégia atual cria um projeto/deploy da Vercel para cada site; isso deve ser reavaliado antes de escalar o volume.
- O backend ainda não possui processo definitivo de deploy, monitoramento e execução contínua na VPS.

## Próximos passos recomendados

1. Repetir o teste real completo usando uma empresa e o número global de teste.
2. Confirmar link público, aprovação e entrega pela Evolution API.
3. Revisar estados de falha, retentativas e retomada de operações interrompidas.
4. Definir a estratégia de publicação em escala na Vercel.
5. Configurar as variáveis do Supabase no backend e executar o teste integrado.
6. Preparar deploy do backend na VPS com processo persistente, logs e monitoramento.

## Decisões que não devem ser presumidas

- Estrutura definitiva das tabelas no Supabase.
- Estratégia final de fila e workers distribuídos.
- Exclusão permanente ou restauração de registros arquivados.
- Política de retenção e remoção dos sites publicados.
- Modelo comercial e texto final das abordagens enviadas às empresas.

Esses itens exigem definição antes da implementação.
