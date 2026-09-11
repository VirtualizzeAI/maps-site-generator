# Padrões de organização de projetos

Este documento registra os padrões de organização adotados pela Virtualizze para projetos com frontend e backend separados. Ele deve evoluir conforme novas decisões forem tomadas e servir como referência para outros projetos.

## 1. Princípios gerais

- Separar frontend e backend quando possuem runtimes, deploys ou responsabilidades diferentes.
- Manter o código-fonte de cada aplicação dentro de `src/`.
- Organizar por responsabilidade e domínio, não por um exemplo rígido de nomes de pastas.
- Criar somente diretórios que tenham uma função real no projeto.
- Manter próximos os arquivos que mudam juntos.
- Evitar arquivos grandes que misturam interface, regras de negócio, acesso a dados e integrações.
- Usar `index.ts` ou `__init__.py` apenas quando simplificarem exportações públicas.
- Manter configurações, dependências, testes, migrations e arquivos de deploy fora de `src/`.
- Cada aplicação deve possuir seu próprio README, dependências e arquivo de exemplo de variáveis de ambiente.
- Segredos nunca devem ser armazenados no código ou enviados ao repositório.

## 2. Estrutura do repositório

Quando frontend e backend forem implantados separadamente, usar um monorepo com esta base:

```text
projeto/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── backend/
│   ├── src/
│   ├── tests/
│   ├── migrations/
│   ├── .env.example
│   ├── requirements.txt ou pyproject.toml
│   └── README.md
├── docs/
├── .gitignore
└── README.md
```

A raiz documenta o produto e a integração entre as aplicações. Os READMEs internos documentam execução e deploy de cada parte.

## 3. Frontend

A estrutura deve respeitar o framework utilizado. Em projetos Next.js com App Router, usar `src/app/` em vez de criar uma pasta `pages/` apenas para seguir um modelo genérico.

Estrutura de referência:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── lib/
│   ├── types/
│   └── styles/
├── public/
├── tests/
├── .env.example
├── package.json
└── README.md
```

### Responsabilidades

- `app/`: rotas, layouts, páginas, estados de carregamento e tratamento de erros.
- `components/ui/`: componentes visuais básicos e reutilizáveis.
- `components/shared/`: componentes compostos utilizados por diferentes áreas.
- `features/`: funcionalidades do produto agrupadas por domínio, como autenticação, operações e empresas.
- `hooks/`: hooks realmente compartilhados entre funcionalidades.
- `services/`: comunicação com API, Supabase e outros serviços externos.
- `lib/`: clientes, utilitários e configurações técnicas compartilhadas.
- `types/`: contratos TypeScript utilizados por mais de um módulo.
- `styles/`: tokens ou estilos globais; estilos específicos devem permanecer próximos do componente.

### Organização de um módulo

Quando um componente ou funcionalidade crescer, ele pode ser dividido internamente:

```text
features/operations/
├── components/
├── hooks/
├── services/
├── types.ts
└── index.ts
```

Não criar antecipadamente pastas vazias como `logic/` ou `style/`. Elas só devem existir quando houver conteúdo suficiente para justificar a separação.

## 4. Backend Python

O backend deve seguir as responsabilidades da aplicação e não copiar conceitos do frontend como componentes, hooks ou páginas.

Estrutura de referência para FastAPI, workers e agendamentos:

```text
backend/
├── src/
│   ├── api/
│   │   ├── dependencies/
│   │   ├── middleware/
│   │   └── routes/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── integrations/
│   ├── workers/
│   ├── scheduler/
│   └── main.py
├── tests/
├── migrations/
├── scripts/
├── .env.example
├── requirements.txt ou pyproject.toml
└── README.md
```

### Responsabilidades

- `api/routes/`: endpoints HTTP, sem concentrar regras de negócio.
- `api/dependencies/`: autenticação, sessão, permissões e dependências do FastAPI.
- `api/middleware/`: CORS, logs, rastreamento e tratamento transversal.
- `core/`: configuração, segurança, logging e constantes centrais.
- `models/`: entidades persistidas e modelos internos.
- `schemas/`: validação de entrada e saída.
- `repositories/`: consultas e persistência no banco.
- `services/`: regras e casos de uso do negócio.
- `integrations/`: clientes de serviços externos.
- `workers/`: tarefas assíncronas e consumidores das filas.
- `scheduler/`: definição e disparo de tarefas agendadas.
- `migrations/`: alterações versionadas do banco.
- `scripts/`: tarefas administrativas ou operacionais executadas manualmente.

### Fluxo de dependências

A direção recomendada é:

```text
rota → serviço → repositório ou integração
worker → serviço → repositório ou integração
scheduler → fila → worker
```

Rotas não devem acessar diretamente o banco ou uma API externa. Workers devem reutilizar os mesmos serviços do restante da aplicação.

## 5. Nomenclatura

### TypeScript

- Componentes React: `PascalCase.tsx`.
- Hooks: `useNome.ts`.
- Funções, serviços e utilitários: `camelCase.ts`.
- Pastas: escolher um único padrão por projeto, preferencialmente `kebab-case`.
- Tipos: nomes claros em `PascalCase`.

### Python

- Arquivos, módulos, funções e variáveis: `snake_case`.
- Classes e schemas: `PascalCase`.
- Constantes: `UPPER_SNAKE_CASE`.
- Testes: `test_<comportamento>.py`.

## 6. Variáveis de ambiente

- Cada aplicação mantém seu próprio `.env.example`.
- O frontend recebe apenas variáveis públicas necessárias ao navegador.
- Tokens administrativos e chaves privadas ficam exclusivamente no backend.
- Variáveis públicas devem usar o prefixo exigido pelo framework, como `NEXT_PUBLIC_`.
- O README deve indicar onde cada variável é configurada no deploy.

## 7. Deploy independente

Frontend e backend devem poder ser instalados, testados e publicados sem depender do diretório de trabalho um do outro.

Para isso:

- nenhum import pode atravessar diretamente `frontend/` e `backend/`;
- cada aplicação possui seu gerenciador de dependências;
- contratos compartilhados são documentados pela API ou gerados a partir de uma especificação;
- a URL do backend é configurada no frontend por variável de ambiente;
- alterações em uma aplicação não devem exigir novo deploy da outra, salvo mudança de contrato.

## 8. Testes

- Testar regras de negócio, deduplicação, autenticação e integrações críticas.
- Não concentrar testes apenas em detalhes visuais ou getters simples.
- Espelhar os domínios principais dentro da pasta de testes.
- Integrações externas devem possuir mocks ou ambientes de teste controlados.
- Antes do deploy, cada aplicação deve possuir ao menos um comando único de validação.

## 9. Critérios para criar uma nova pasta

Criar uma nova pasta quando pelo menos uma destas condições for verdadeira:

- há mais de um arquivo com a mesma responsabilidade;
- o módulo possui uma API pública clara;
- os arquivos mudam juntos por causa da mesma funcionalidade;
- a separação reduz dependências ou facilita testes.

Não criar uma pasta quando ela servirá apenas para envolver um único arquivo sem responsabilidade própria.

## 10. Checklist para novos projetos

- [ ] Frontend e backend precisam de deploy separado?
- [ ] Cada aplicação possui `src/`, README e `.env.example`?
- [ ] A estrutura respeita o framework escolhido?
- [ ] Regras de negócio estão separadas da interface e das rotas?
- [ ] Integrações externas estão isoladas?
- [ ] Não existem segredos no repositório?
- [ ] Cada pasta possui uma responsabilidade clara?
- [ ] É possível executar e publicar cada aplicação separadamente?
- [ ] Os contratos entre frontend e backend estão documentados?
- [ ] Existem comandos de validação antes do deploy?

## 11. Regra de evolução

Este documento é uma referência, não uma árvore imutável. Novas pastas devem surgir a partir de necessidades reais. Sempre que uma decisão estrutural passar a ser adotada como padrão para outros projetos, ela deve ser registrada aqui com a justificativa correspondente.
