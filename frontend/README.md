# Frontend

Interface Next.js do Virtualizze Prospector, organizada em `src/` por responsabilidade e domínio.

```text
src/
├── app/          # rotas e layouts Next.js
├── components/   # componentes visuais reutilizáveis
├── features/     # funcionalidades do produto
├── services/     # clientes compartilhados
├── lib/          # utilitários
└── styles/       # estilos globais e vendor
```

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Defina **Root Directory** como `frontend`.
3. Use o framework **Next.js** e mantenha o diretório de saída padrão do framework.
4. Cadastre `NEXT_PUBLIC_API_URL` em **Settings → Environment Variables**, no ambiente **Production**, com a URL HTTPS pública do backend. Exemplo: `https://api.seudominio.com` (substitua pelo domínio real, sem `/api/v1`). Para deploys de Preview, configure também essa variável no ambiente **Preview**, apontando para o backend adequado.
5. Publique. O arquivo `vercel.json` executa lint e build em cada deploy.

O build na Vercel recusa uma URL ausente, inválida, sem HTTPS ou de loopback. A variável é pública: nunca inclua tokens, senhas ou chaves nela. Alterações em `NEXT_PUBLIC_API_URL` exigem novo deploy, pois o Next.js incorpora o valor ao JavaScript durante o build.

### Preparar o backend

O backend precisa estar acessível publicamente por HTTPS e conectado ao Supabase. Um backend disponível apenas em `localhost:8000` não atende o painel publicado.

No ambiente do backend, configure:

```env
FRONTEND_URL=https://seu-painel.vercel.app
PUBLIC_API_URL=https://api.seudominio.com
```

Substitua pelos domínios reais. `FRONTEND_URL` deve corresponder exatamente à origem do painel, sem barra final ou caminho, para liberar o CORS. Reinicie o backend após alterar seu ambiente. A configuração atual permite uma origem por vez; para testar Preview, use um backend com `FRONTEND_URL` correspondente à origem desse Preview.

Mantenha `DATABASE_URL`, as chaves do Supabase e as credenciais das integrações exclusivamente no backend.

### Validar após publicar

1. Abra `https://api.seudominio.com/health` e confirme a resposta de saúde do backend.
2. Abra o domínio do painel, faça login e confira o carregamento de empresas e operações.
3. Acesse diretamente uma rota como `/operations/<id existente>` e recarregue a página para confirmar sua abertura.
4. Se houver erro de rede, confira no navegador a URL da API, HTTPS e a origem permitida pelo CORS do backend.

Referências: [projetos em monorepositórios na Vercel](https://vercel.com/docs/monorepos) e [variáveis de ambiente do Next.js](https://nextjs.org/docs/app/guides/environment-variables).

O navegador usa o token de autenticação emitido pela API Fastify e chama o backend Node.js pela URL configurada em `NEXT_PUBLIC_API_URL`. Nesta fase, o frontend não acessa Supabase nem qualquer banco diretamente.

## Confirmação de ações

O layout inclui `ActionNotifications`, com notificações compactas no canto superior direito, usando Radix Toast. Os handlers de ações explícitas usam `useActionNotification` para informar sucesso ou erro com mensagem contextual. Não registrar notificações nos métodos compartilhados de leitura ou no polling, para evitar interrupções repetidas. As notificações permanecem durante navegação, não bloqueiam a tela nem movem o foco e informam falhas parciais de arquivamento em lote. Sucesso fecha após 5 segundos e erro após 8 segundos; passar o mouse ou focar a área pausa o tempo. Cada notificação pode ser fechada pelo X, e múltiplos resultados são empilhados. O layout se adapta à largura do celular e mantém anúncio acessível por leitor de tela.

## Operação avançada

**Nova operação → Tipo de operação** mantém Padrão como opção inicial. Avançada habilita o seletor Luna (mais econômico), Sol (equilíbrio recomendado) e Astra (mais potente e caro), com referência de preços e explicação do custo da busca. O modelo vale só para a análise. A lista identifica tipo/modelo e o detalhe mostra fontes, motivos, confiança da IA, custo separado e uma seção de análises inconclusivas para conferência, sem geração/envio desses casos. O histórico da empresa mantém as evidências e o painel exibe o acumulado das análises avançadas.

## Modal de análise e criação por empresa

No Kanban e em Análises inconclusivas, cartões avançados mostram só os dados da empresa, resultado/modelo/confiança e **Análise completa**, que abre um modal com todas as evidências e custos. **Criar site** publica sem preparar mensagem; **Criar e abordar** também prepara a abordagem, respeitando o modo da operação. As duas ações pedem confirmação e mostram resultado por notificação lateral. Ficam disponíveis somente quando autorizadas pela API. Resultados elegíveis de operações avançadas agora aguardam essa escolha por empresa; a operação padrão continua como antes. Sites sem abordagem ficam em seção própria, com opção de abordar depois usando a mesma URL.

## Lista de empresas e detalhes

Empresas usa linhas em lista responsiva, com nome, segmento/cidade, telefone, **Site gerado** e **Detalhes**. O link principal procura o último vínculo com URL publicada, ignorando operações posteriores sem site; todos os sites continuam acessíveis no histórico. Sem URL publicada, mostra Sem site gerado. Operações, análises completas, fontes, custos e demais contatos ficam no modal de detalhes da empresa, sem abrir um segundo modal para consultar a análise. Seleção, arquivamento individual/em lote e permissões são preservados.
## Prospecção web

Menu **Prospecção web**, também disponível em `/prospecting`: criação por nicho/cidade com checkboxes **LinkedIn e responsáveis** e **Redes sociais e telefones**, modelo e quantidade. Permite um ou ambos os grupos; site existente, endereço e análise rápida são pesquisados sempre. Não gera sites nem envia mensagens.

Histórico e resultados atualizam automaticamente pela API própria. Cada empresa abre um modal com fontes, perfis profissionais/cargos/evidências e indicação de vínculo incerto, além dos contatos selecionados e consumo. Administradores/operadores criam; visualizadores consultam. A interface trata vazio, carregamento, erro, validação e confirma criação por notificação compacta.
