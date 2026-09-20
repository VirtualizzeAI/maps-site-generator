# Arquitetura do Virtualizze Prospector

## Aplicações

- `frontend/`: Next.js e TypeScript, preparado para a Vercel.
- `backend/`: Fastify e TypeScript, preparado para a VPS.
- Cada pasta possui seu próprio `package.json`, dependências e deploy.

## Backend local

Um único processo Node.js executa:

- API HTTP;
- autenticação e controle de usuários;
- worker das operações;
- verificação das operações agendadas;
- persistência JSON local;
- hospedagem dos sites gerados no modo de teste.

Essa decisão simplifica o desenvolvimento local. Depois dos testes, a camada `store.ts` será substituída por um repositório Supabase/PostgreSQL sem alterar os contratos da API ou o frontend.

## Fluxo da operação

1. O usuário cria ou agenda uma operação.
2. O worker busca empresas pelo nicho e cidade.
3. As identidades fortes são normalizadas e comparadas com o histórico.
4. Empresas presentes em operações anteriores são bloqueadas.
5. A presença digital é analisada além do campo `website` da busca.
6. O site é gerado e publicado.
7. A mensagem recebe o nome da empresa e a URL gerada.
8. O envio acontece automaticamente ou aguarda aprovação humana.

## Histórico e arquivamento

- Cada empresa preserva dados de contato, endereço, links, primeira pesquisa e operações relacionadas.
- Contatos públicos encontrados no site original durante a análise são incorporados ao cadastro.
- Operações e empresas são arquivadas, não removidas definitivamente.
- O arquivamento é permitido apenas para administradores e mantém a deduplicação ativa.

## Modos de integração

- `mock`: executa o fluxo completo localmente sem cobranças ou mensagens reais.
- `real`: utiliza Serper, OpenAI, Vercel e Evolution API.
