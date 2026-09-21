# Instruções para agentes de desenvolvimento

Este arquivo orienta qualquer sessão do Codex que trabalhe neste repositório. As regras valem para todo o projeto.

## Leitura obrigatória antes de alterar código

Leia, nesta ordem:

1. `README.md`;
2. `docs/CURRENT_STATUS.md`;
3. `docs/architecture.md`;
4. `docs/project-standards.md`;
5. o `README.md` da aplicação afetada;
6. `git status` e o histórico recente do Git.

Não implemente uma decisão registrada como pendente sem confirmação do usuário.

## Contexto do produto

O Maps Site Generator é um sistema da Virtualizze que:

1. busca empresas no Google Maps por nicho e cidade;
2. impede prospecções duplicadas pelo histórico;
3. analisa a presença digital;
4. gera um site com IA;
5. publica o site na Vercel;
6. monta e envia uma abordagem pelo WhatsApp, automaticamente ou após aprovação humana.

## Decisões obrigatórias

- Manter `frontend/` e `backend/` como aplicações independentes.
- Usar somente Node.js e TypeScript. Não introduzir Python ou Docker sem nova decisão explícita.
- O frontend acessa dados apenas pela API própria do backend.
- Persistir autenticação e dados no Supabase; o frontend continua acessando dados somente pela API própria.
- Validar autenticação, organização, função do usuário e acesso ao registro no backend.
- Preservar a deduplicação de empresas entre operações.
- Arquivar empresas e operações não remove suas identidades do histórico.
- Somente administradores podem arquivar empresas ou operações e gerenciar usuários.
- Quando o modo global de teste do WhatsApp estiver ativo, o backend deve substituir o destinatário antes de chamar a Evolution API.
- Sites reais devem ser publicados como produção e salvar um domínio público da Vercel.
- Nunca incluir `.env`, tokens, chaves, senhas ou o banco local no Git.

## Frontend

- Stack: Next.js, React e TypeScript.
- Organizar por rotas, funcionalidades, componentes e serviços.
- Manter o menu lateral fixo no desktop e responsivo no celular.
- Tratar carregamento, vazio, erro, sucesso e falta de permissão.
- Atualizar dados localmente após ações; não usar `window.location.reload()` para operações de CRUD.
- Não colocar regras de autorização apenas na interface.

## Backend

- Stack: Fastify e TypeScript.
- API, worker e agendador rodam no mesmo processo durante a fase local.
- Validar toda entrada externa.
- Concentrar integrações externas em `src/integrations/`.
- Manter modos `mock` e `real` atrás dos mesmos contratos.
- Erros enviados ao frontend não devem expor credenciais ou respostas sensíveis de provedores.
- Alterações relevantes de estado devem continuar gerando eventos de auditoria.

## Cuidados com integrações reais

- Não enviar mensagens reais sem confirmar se o modo de teste está ativo e qual número receberá o envio.
- Não registrar chaves de Serper, OpenAI, Vercel ou Evolution em logs.
- Na Vercel, usar deploy `production` e o alias público, não a URL protegida de preview.
- Uma falha externa deve deixar a operação e a empresa em estado compreensível e recuperável.

## Validação mínima

Antes de concluir mudanças no frontend:

```bash
cd frontend
npm run lint
npm run build
```

Antes de concluir mudanças no backend:

```bash
cd backend
npm test
npm run build
```

Execute `npm install` apenas quando dependências ou o lockfile mudarem.

## Git e entrega

- Preserve alterações locais do usuário e não use comandos destrutivos.
- Faça commits pequenos, coerentes e com mensagem objetiva.
- Não use `git reset --hard`, force-push ou reescrita de histórico sem autorização explícita.
- Ao terminar, informe arquivos alterados, validações realizadas e riscos ou decisões pendentes.
- Atualize `docs/CURRENT_STATUS.md` quando uma mudança alterar funcionalidade, arquitetura, integrações, limitações ou próximos passos.

## Dados e arquivos locais

- Arquivar não significa apagar definitivamente.
- O PostgreSQL do Supabase é a fonte persistente dos dados operacionais.
- `backend/data/sites/` pode conter sites gerados no modo `mock` e nunca deve ser versionado.
