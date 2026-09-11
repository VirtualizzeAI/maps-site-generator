# Padrões de organização de projetos

Este documento registra as decisões reutilizáveis da Virtualizze para projetos com frontend e backend independentes.

## Separação das aplicações

- `frontend/` contém apenas interface, contratos HTTP e recursos necessários ao deploy do cliente.
- `backend/` contém API, regras de negócio, persistência, workers, agendamento e integrações externas.
- Cada aplicação tem suas próprias dependências, variáveis de ambiente, documentação e processo de deploy.
- O frontend nunca acessa o banco diretamente; toda regra de negócio passa pela API.
- Nomes de pastas representam responsabilidades reais do projeto. Exemplos de estrutura são referências, não modelos literais.

## Frontend

- `app/`: rotas, layouts e composição de páginas.
- `components/`: elementos reutilizáveis de interface.
- `features/`: módulos de produto com componentes, serviços e tipos próximos.
- `services/`: clientes compartilhados, autenticação e comunicação externa.
- `lib/`: funções utilitárias sem regra de negócio.

## Backend

- `api/`: rotas e dependências HTTP; sem regras longas de negócio.
- `schemas/`: contratos validados de entrada e saída.
- `models/`: entidades persistidas.
- `repositories/`: consultas e escrita no banco.
- `services/`: regras de negócio e orquestração.
- `integrations/`: adaptadores para serviços externos.
- `workers/`: execução assíncrona e retomável.
- `core/`: configurações e infraestrutura compartilhada.
- `migrations/`: evolução versionada do banco.

## Dados e segurança

- Segredos ficam apenas em variáveis de ambiente ou cofre apropriado e nunca entram no Git.
- Empresas e operações são entidades diferentes: a empresa mantém o histórico global; cada operação registra sua tentativa.
- A deduplicação usa identificadores fortes e impede nova prospecção da mesma empresa.
- Mudanças de estado relevantes geram eventos de auditoria.

## Entrega

- Frontend e backend devem compilar e ser implantáveis separadamente.
- O repositório oferece modo local sem serviços pagos para validar o fluxo.
- Integrações ficam atrás de adaptadores `mock` e `real`.
- Antes de publicar: executar lint, build, testes, verificar variáveis e trocar credenciais padrão.
