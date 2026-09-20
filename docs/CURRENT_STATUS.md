# Estado atual do Maps Site Generator

Última revisão: 20 de setembro de 2026.

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
- A persistência atual é `backend/data/database.json`.
- Sites gerados também são mantidos localmente em `backend/data/sites/`.
- O frontend nunca acessa o banco diretamente.

## Funcionalidades implementadas

### Acesso e administração

- Login local com token.
- Organizações, membros e perfis `admin`, `operator` e `viewer`.
- Cadastro de usuários pelo painel.
- Autorização validada no backend.

### Operações

- Criação manual ou agendada por nicho, cidade e quantidade.
- Modos de envio automático ou com aprovação humana.
- Worker interno e acompanhamento do estágio atual.
- Página `/operations/[id]` atualizada por polling.
- Kanban sem duplicação de cards:
  - localizadas;
  - em análise;
  - site criado ou envio;
  - descartadas ou bloqueadas.
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
- As chaves podem vir do `.env` ou da configuração local persistida.

### Segurança do teste de WhatsApp

- Toggle global de modo de teste.
- Número global de teste.
- Substituição do destinatário feita no backend.
- Registro separado do telefone original e do destinatário efetivo.
- Aviso visível no painel e na fila de aprovação.

### Publicação na Vercel

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

Login inicial local:

```text
E-mail: admin@virtualizze.com
Senha: admin123
```

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

- O JSON local é adequado apenas para testes e uma única instância do backend.
- API, worker e agendador no mesmo processo não oferecem fila distribuída nem alta disponibilidade.
- Credenciais salvas pela interface ficam no armazenamento local sem criptografia.
- O login inicial possui senha conhecida e deve ser trocado antes de qualquer publicação.
- Não existem ainda migrations definitivas do Supabase para o modelo atualmente validado.
- Retentativas, idempotência e recuperação de falhas externas ainda precisam ser fortalecidas.
- A estratégia atual cria um projeto/deploy da Vercel para cada site; isso deve ser reavaliado antes de escalar o volume.
- O backend ainda não possui processo definitivo de deploy, monitoramento e execução contínua na VPS.

## Próximos passos recomendados

1. Repetir o teste real completo usando uma empresa e o número global de teste.
2. Confirmar link público, aprovação e entrega pela Evolution API.
3. Revisar estados de falha, retentativas e retomada de operações interrompidas.
4. Definir a estratégia de publicação em escala na Vercel.
5. Consolidar o modelo validado em migrations do Supabase/PostgreSQL.
6. Substituir autenticação e repositório locais pelas implementações do Supabase.
7. Preparar deploy do backend na VPS com processo persistente, logs e monitoramento.

## Decisões que não devem ser presumidas

- Estrutura definitiva das tabelas no Supabase.
- Estratégia final de fila e workers distribuídos.
- Exclusão permanente ou restauração de registros arquivados.
- Política de retenção e remoção dos sites publicados.
- Modelo comercial e texto final das abordagens enviadas às empresas.

Esses itens exigem definição antes da implementação.
