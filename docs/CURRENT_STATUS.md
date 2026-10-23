# Estado atual do Maps Site Generator

Última revisão: 23 de outubro de 2026.

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
