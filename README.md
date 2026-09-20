# Maps Site Generator

Sistema da Virtualizze para buscar empresas, analisar presença digital, gerar e publicar sites e realizar prospecção pelo WhatsApp.

## Estrutura

```text
maps-site-generator/
├── frontend/   # Next.js + TypeScript — Vercel
├── backend/    # Fastify + TypeScript — VPS
└── docs/       # arquitetura e padrões
```

Todo o sistema utiliza Node.js e TypeScript. Não há dependência de Python ou Docker.

## Rodar localmente

Backend:

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Frontend, em outro terminal:

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Acesse `http://localhost:3000` com:

```text
E-mail: admin@virtualizze.com
Senha: admin123
```

O backend roda em `http://localhost:8000`. No modo padrão `mock`, todo o fluxo funciona localmente e os dados ficam em `backend/data/database.json`.

## Acompanhamento das operações

Cada linha do histórico abre a rota `/operations/[id]`, que atualiza automaticamente e mostra:

- empresa e etapa atual do processamento;
- Kanban com localizadas, em análise, site criado/envio e descartadas/bloqueadas;
- sites publicados, mensagens enviadas e progresso da operação;
- aviso quando o modo global de teste do WhatsApp estiver ativo.

O histórico das empresas armazena nome, endereço, telefones, e-mail, site, Google Maps, redes sociais encontradas, data e hora da pesquisa, operações relacionadas e os sites gerados. Empresas e operações podem ser arquivadas por administradores; o arquivamento não remove a identidade usada para impedir prospecções duplicadas.

O número de teste é configurado em **Configurações → Número global para testes**. Enquanto estiver ativo, o backend redireciona todos os envios para esse número e mantém o telefone original da empresa no histórico.

## Comandos

| Aplicação | Desenvolvimento | Build | Produção |
|---|---|---|---|
| Frontend | `npm run dev` | `npm run build` | `npm start` |
| Backend | `npm run dev` | `npm run build` | `npm start` |

Antes de publicar, troque a senha administrativa e configure as variáveis de ambiente.
