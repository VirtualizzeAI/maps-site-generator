# Estado atual do Maps Site Generator

Última revisão: 23 de novembro de 2026.

## Pesquisa web focada, CNPJ e sócios/fundadores

- Novas pesquisas priorizam site próprio, Instagram, Facebook e LinkedIn. Prompts direcionam consultas por nome/cidade e excluem prefeituras, licitações, diários e documentos genéricos. O backend descarta fontes governamentais sem relação cadastral, mantendo exceções Receita/REDESIM; fontes do conselho médico são pertinentes para CRM. O relatório registra somente fontes utilizadas nos campos aceitos, sem despejar todas as páginas retornadas pela ferramenta. Pesquisa sem evidências úteis fica inconclusiva.
- Quando encontra CNPJ, busca razão social, situação/endereço cadastral, QSA e contatos comerciais cadastrados. Valida dígitos do CNPJ numérico/alfanumérico e exige fonte consultada e correspondência de identidade; dados cadastrais de terceiros/incertos são omitidos. Sócio do QSA não é automaticamente fundador. Contatos cadastrais ficam separados dos contatos profissionais individuais, pois podem ser da contabilidade.
- Grupo LinkedIn e responsáveis inclui pesquisa de até quatro sócios/fundadores, perfis profissionais e CRM médico quando aplicável. Grupo Redes sociais e telefones controla contatos cadastrais/profissionais e Instagram/Facebook. Campos de grupos não selecionados são removidos no backend; contatos privados, fontes ausentes, homônimos/UF inválida e formulários genéricos de consulta não viram registros médicos confirmados. CRM divulgado em página profissional fica distinto de fonte individual do conselho. A pesquisa assistida por IA pode não encontrar dados ou confundir informações públicas; vínculos incertos ficam identificados, sem contatos/CRM atribuídos automaticamente.
- Modal da operação e do CRM mostra CNPJ/QSA, contatos cadastrais, sócios/fundadores, perfis e registro médico com UF/fonte. Campos são opcionais no JSONB já existente (`research_version:2`); histórico anterior e kanbans são preservados, sem migration ou reprocessamento pago. Permanecem 6 chamadas web, 10.000 tokens de saída e 180 segundos por requisição, com custo persistido antes da interpretação. Não altera geração/envio.
- Validação: 134 testes e build backend; lint/build frontend; navegador desktop/mobile para dados cadastrais, separação de contatos, CRM oficial/informado, grupos selecionados, legado, não encontrados e modal no kanban. API publicada em organizações temporárias validou JSONB completo, recarga, dados retornados/permissões e isolamento. Fixtures removidas; nenhuma pesquisa paga, geração ou envio real executado. Referências consultadas: [consulta CNPJ/QSA](https://www.gov.br/pt-br/servicos/consultar-cadastro-nacional-de-pessoas-juridicas), [DV CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj), [busca médica CFM](https://portal.cfm.org.br/busca-medicos) e [web_search](https://developers.openai.com/api/docs/guides/tools-web-search).

## Página da operação web e CRM com kanbans

- Cada operação de prospecção web abre `/prospecting/operations/[id]`, com abas Informações (configuração, datas, processamento e custos) e Resultado (lista de empresas, análise/contatos e site existente). Criação abre a nova página e o detalhe continua atualizando automaticamente.
- Menu CRM prospecção (`/prospecting/crm`) permite criar, renomear e excluir kanbans, criar/editar/reordenar/excluir etapas e acompanhar empresas. Novos quadros começam com quatro etapas editáveis. Resultados oferecem Adicionar ao kanban, com seleção de quadro e etapa. Cartões mantêm link da operação de origem e análise completa, sem duplicar pesquisas ou disparar geração/envio.
- Movimentação por ponteiro (mouse/toque) no ícone de arrastar ou por modal Mover etapa para teclado. Gravação só confirma após sucesso da API; conflitos de estágio são recusados para não sobrescrever movimentos concorrentes. Empresa repetida no mesmo quadro é bloqueada pela chave da pesquisa (nome/cidade), inclusive em pedidos simultâneos; pode participar de quadros distintos.
- Exclusões pedem confirmação. Etapa ocupada exige outra etapa de destino e transfere empresas atomicamente; a última etapa ocupada exige criar outra antes. Exclusão de quadro/cartão é lógica, mantém auditoria e preserva pesquisas de origem e deduplicação do fluxo de sites. Administradores/operadores alteram o CRM; visualizadores consultam. Não há envio de WhatsApp pelo CRM.
- Migration `202611220002_prospecting_crm.sql` cria quadros, etapas e cartões com chaves por organização, unicidade de empresa ativa por quadro e RLS sem acesso direto dos papéis do navegador. Backend continua em processo único com gravações serializadas. Validação do backend: 119 testes e build; API publicada em organização temporária verificou CRUD, transferência, conflitos, permissões, recarga de dados do banco, RLS e preservação da pesquisa. Lint/build do frontend e navegador desktop/mobile verificaram página/abas, modais, escolhas, CRUD, arrastar por mouse/toque, recarga, conflitos/erros e perfil visualizador, com APIs simuladas. Fixtures removidas; nenhum consumo de IA, site ou mensagem real.

## Prospecção web sem geração de sites

- Nova página/menu Prospecção web (`/prospecting`) pesquisa empresas por nicho/cidade diretamente com OpenAI Responses + web_search, sem Maps/Serper. Formulário permite escolher LinkedIn e responsáveis, Redes sociais e telefones, ou ambos, além de quantidade (1–30) e os três modelos existentes. Site próprio existente, endereço e análise breve são buscados sempre. Não gera sites, prepara abordagens nem envia mensagens.
- Resultados em lista abrem modal com análise, página da empresa/perfis no LinkedIn, cargo, evidência e vínculo confirmado ou incerto; contatos comerciais e fontes por contato. Grupos não selecionados são omitidos no backend e na interface. Links devem constar nas fontes retornadas pela ferramenta; redes sociais e diretórios conhecidos não são tratados como site próprio. Isso não garante que todos os responsáveis sejam encontrados ou que a informação pública esteja atualizada.
- Histórico, opções, autor, fontes, resultados e consumo persistidos em tabelas próprias. Descoberta e análise por empresa têm consumo registrado antes da interpretação, acumulando tokens/chamadas web/custo estimado, com indicação de valores indisponíveis. Não altera empresas, deduplicação ou histórico de contato do fluxo de sites. Repetições são removidas dentro de cada nova pesquisa; pesquisar novamente não equivale a abordar.
- Administradores/operadores criam; visualizadores consultam; API valida organização/perfil. Migration `202611220001_web_prospecting.sql` cria tabelas com RLS e sem acesso direto de anon/authenticated. Backend mantém um único worker, respeitando a ordem de criação entre operações de sites/pesquisa (ações manuais de sites preservam prioridade existente). Limites por requisição: 6 chamadas de ferramenta, 10.000 tokens de saída e 180 segundos; custos dependem da quantidade/modelo/fontes.
- Falha por empresa fica inconclusiva e permite continuar as demais. Falha de descoberta encerra com erro; não inventa empresas para atingir a quantidade. Não há repetição paga automática. Reinício no meio da pesquisa preserva o que já foi gravado, mas operações em processamento exigem conferência e não são retomadas automaticamente.
- Validação: 107 testes e build do backend; lint/build frontend; navegador desktop/mobile para criação, checkboxes, seleção de modelo, erros, resultados, fontes, perfis/vínculo incerto, telefones e visualizador. API publicada também validou persistência/recarga JSONB, autenticação, isolamento entre organizações, perfil visualizador, limites/seleção e RLS em organizações temporárias, removidas ao final. Testes de integrações usaram mocks, sem pesquisa paga, geração, publicação de sites ou envio real.

## Listagem de empresas em linhas e botão do site

- Empresas passa a usar lista de linhas responsivas, com nome, segmento/cidade, telefone e ações Site gerado/Detalhes. Site gerado fica visível fora do histórico, com nova aba, usando o vínculo mais recente com URL válida (operações posteriores bloqueadas/sem site não escondem links anteriores). Ausência de URL é indicada explicitamente.
- Modal de detalhes reúne contatos, operações, status, todos os sites, análises completas, fontes e custos. Análise é exibida diretamente no modal da empresa, evitando modais sobrepostos. Lista não exibe histórico/custos expandidos. Dados e API existentes foram preservados, sem alteração de backend ou reinício de serviço.
- Validação: lint/build do frontend; navegador desktop/mobile para lista/links recentes e antigos, operação posterior sem URL, detalhes/custos apenas no modal, foco/Escape, arquivamento individual/em lote, vazio e perfil visualizador. Dados e requisições de ações foram simulados; consulta real somente leitura confirmou links persistidos no banco. Nenhum dado operacional foi alterado nem mensagem enviada.

## Análise completa em modal e ações por empresa

- Cartões avançados no Kanban e na seção de inconclusivos exibem dados da empresa, resultado, modelo/confiança e Análise completa. Modal acessível reúne justificativa, sites, fontes, custos e informações do processamento, com fechamento por X/Escape e adaptação mobile. Detalhes longos/custos saíram dos cartões.
- Operações avançadas passam a concluir a pesquisa e aguardar escolha por empresa, inclusive resultados elegíveis (`analysis_ready`). Criar site publica sem preparar mensagens; Criar e abordar prepara mensagem e respeita aprovação humana/automático e intervalo. Site já criado é reaproveitado na abordagem posterior. Padrão mantém o fluxo anterior.
- Administradores/operadores podem solicitar ações em análises prontas, inconclusivas, sites próprios identificados e sites criados sem abordagem. Backend valida organização, perfil, arquivamento, telefone na abordagem, estado e histórico, serializa pedidos e registra autor/ação. Não permite ignorar deduplicação, mensagens existentes ou contato anterior. Enquanto a operação processa, novas solicitações são bloqueadas. Falhas não são repetidas automaticamente; filas ainda não iniciadas são persistidas, mas processamento interrompido no meio requer conferência.
- Migration `202611180001_manual_site_actions.sql` aplicada antes do backend. Worker único executa fila manual sem repetir análise, preserva URL/custo antes de preparar/enviar mensagem e exibe sites sem abordagem em seção própria. Aprovar outra mensagem não conclui operação com geração manual em andamento.
- Validação: 86 testes e build backend; lint/build frontend; navegador para resumo/modal, fontes/custos, foco/Escape, ações no Kanban/inconclusivos, desistência/erro/fila e mobile. API em organizações temporárias validou permissões/isolamento, disponibilidade por perfil, estados/deduplicação, persistência/autoria, fila/worker e reaproveitamento de site com preparação de aprovação humana. Testes de geração/envio usaram mocks; teste real de API reutilizou URL fictícia já cadastrada e não aprovou mensagem. Fixtures removidas; nenhuma pesquisa/geração paga, publicação ou envio real executado.

## Operações avançadas com pesquisa web

- Nova operação oferece Padrão (comportamento anterior, padrão para clientes antigos) e Avançada, com seletor Luna — mais econômico; Sol — equilíbrio recomendado (padrão avançado); Astra — mais potente e caro. Tipo/modelo são persistidos por operação e exibidos na lista/detalhe. Modelo da geração de sites continua nas Configurações.
- Avançada usa OpenAI Responses + web_search, até 3 chamadas de ferramentas, 6.000 tokens de saída e 120 segundos por empresa. Só libera geração com pesquisa concluída, fontes e identidade por telefone/endereço com número, confiança da IA >=80 e nenhum site oficial identificado/conflito com Maps. Site oficial impede geração; dúvidas, falhas e respostas inválidas ficam em seção de análises inconclusivas, sem gerar/enviar. Não há endpoint de liberação/retomada de inconclusivos nesta versão. Deduplicação global e aprovação/intervalos existentes são preservados.
- Evidências, sites, fontes, confiança e uso ficam no vínculo e histórico da empresa, com auditoria. Uso pago é salvo antes da interpretação. Custo de análise (tokens + chamadas web) é separado do custo dos sites, com acumulado por operação/organização e indicação de valores indisponíveis. Modo mock não consome serviços reais.
- Migration `202611170001_advanced_analysis.sql` aplicada antes do backend; operação existente manteve tipo padrão. Validação: 78 testes e build do backend; lint/build do frontend; navegador desktop/mobile para seletor, modelos/preços, erro/nova tentativa, payload, fontes, custos e inconclusivos. API em organizações temporárias validou clientes antigos, três modelos/persistência, tipos/modelos inválidos, autenticação/perfis/isolamento, histórico e totais. Operações de teste foram agendadas no futuro e removidas; nenhuma pesquisa paga, site ou mensagem real foi executada. Dados reais existentes preservados.

## Notificações compactas e reinício autorizado da base

- Resultados de ações usam notificações pequenas no canto superior direito, com ícone de sucesso/erro, texto e botão fechar. Não há overlay, bloqueio ou captura do foco. Sucessos fecham em 5 segundos, erros em 8; mouse/foco pausam o tempo e resultados simultâneos são empilhados. Mantém notificações durante navegação, anúncio acessível e layout mobile.
- Por solicitação expressa do usuário em 16/11/2026, dados operacionais anteriores foram removidos permanentemente: 20 empresas, 74 identidades de deduplicação, 5 operações, 22 vínculos, 9 sites, 9 mensagens e 52 eventos. A limpeza é uma ação administrativa pontual autorizada, não muda o comportamento de arquivamento do produto. Custos históricos foram zerados junto com os dados. Arquivos locais de sites e 7 projetos gerados ainda existentes na Vercel foram removidos; projetos já ausentes não exigiram remoção. O painel Vercel foi preservado.
- Uma organização, dois usuários, vínculos, credenciais e configurações foram preservados. Usuário confirmou desativar `whatsapp_test_mode`; próximos envios usam os destinatários das empresas. Nenhuma operação foi iniciada e nenhuma mensagem enviada durante a limpeza. Backup operacional/arquivos e inventário de remoção protegidos em `/opt/backups/maps-site-generator/reset-20261116`, fora do Git.
- Banco verificado vazio para todas as tabelas operacionais, backend reiniciado para descartar o cache anterior e saúde confirmada. Validação do frontend: lint/build e navegador desktop/mobile para tamanho, ausência de modal/captura de foco, fechamento, múltiplas notificações, navegação, expiração e pausa. Requisições de interface simuladas, sem criar dados em produção.

## Cancelamento de mensagens pendentes

- Aprovações inclui Cancelar envio para administradores/operadores, com confirmação, bloqueio durante edição/envio e modal de sucesso/erro. Item é removido localmente após sucesso, sem recarregar página; visualizadores não têm o botão.
- Backend valida organização, perfil, registros ativos e estado pendente; compartilha bloqueio com edição/aprovação. Mensagem e vínculo recebem `cancelled`, contador de descartadas é atualizado e auditoria registra o autor. Conteúdo, site, custos e identidade histórica são preservados; não chama WhatsApp e recusa aprovação posterior.
- Última pendência conclui operação aguardando aprovação; operação ainda processando não é encerrada. Migration `202611160001_cancel_pending_messages.sql` amplia os estados permitidos de mensagens e foi aplicada antes do backend.
- Validação: 62 testes e build do backend, lint/build do frontend; API em organizações temporárias validou persistência, permissões/isolamento, saída da fila, rejeição de enviados/repetição/aprovação posterior, concorrência, auditoria e conclusão da última pendência. Navegador validou confirmação/desistência, erro/nova tentativa, sucesso, edição, visualizador e mobile. Fixtures removidas; nenhum envio real foi realizado.

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
