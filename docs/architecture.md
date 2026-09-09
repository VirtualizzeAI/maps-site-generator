# Arquitetura proposta

## Objetivo

Executar operações de prospecção configuráveis, manuais ou agendadas, com rastreabilidade completa desde a busca até o envio pelo WhatsApp.

## Fluxo de uma operação

1. O usuário informa nicho, cidade, quantidade e horário.
2. A busca retorna candidatos e salva os dados brutos.
3. O sistema deduplica os candidatos contra a base de empresas.
4. O analisador verifica site, redes, qualidade da presença digital e sinais de oportunidade.
5. Empresas inelegíveis são descartadas com um motivo registrado.
6. Para empresas aprovadas, a IA produz o site e a mensagem.
7. O site é validado e publicado na Vercel.
8. A URL publicada é inserida na mensagem.
9. No modo automático, a mensagem é enviada pelo WhatsApp configurado.
10. No modo revisão humana, a mensagem aguarda edição ou aprovação.
11. Eventos, tentativas e erros permanecem disponíveis na linha do tempo.

## Separação de responsabilidades

- **API:** autenticação, usuários, configurações e consultas do painel.
- **Orquestrador:** cria operações e distribui etapas para filas.
- **Workers:** busca, análise digital, geração, deploy e envio.
- **Scheduler:** dispara operações agendadas.
- **Banco:** fonte de verdade de empresas, operações, resultados e auditoria.
- **Armazenamento:** HTML, capturas e artefatos dos sites gerados.
- **Interface:** visão geral, operação em tempo real, empresas, revisões e configurações.

## Estados principais

`scheduled` → `searching` → `analyzing` → `generating` → `deploying` → `awaiting_approval` ou `sending` → `completed`

Qualquer etapa pode registrar `failed`, `retrying`, `discarded` ou `cancelled`.

O status da operação e o status de cada empresa devem ser armazenados separadamente.

## Modelo de dados inicial

### users

Identidade, função, empresa e estado de acesso.

### companies

Cadastro canônico da empresa: nome normalizado, telefone, endereço, coordenadas, domínio, perfis sociais e identificadores externos. Serve para cache e deduplicação.

### operations

Configuração imutável da execução: usuário, nicho, cidade, quantidade, modo de aprovação, template, conexão WhatsApp, agendamento e datas.

### operation_companies

Relação entre operação e empresa. Guarda o estágio atual, decisão, motivo de descarte, pontuação, site publicado e mensagem final.

### digital_analyses

Evidências encontradas, URLs consultadas, resultado das verificações, pontuação e versão das regras usadas.

### generated_sites

HTML/artefato, prompt, modelo, versão, URL Vercel, projeto/deployment e status de publicação.

### messages

Template resolvido, destinatário, modo, aprovação, usuário aprovador, identificador da Evolution e status de entrega.

### events

Linha do tempo append-only para auditoria e atualização da interface em tempo real.

### integrations

Conexões de Serper, OpenAI, Vercel e Evolution. Segredos devem ser criptografados e nunca retornados integralmente para a interface.

## Regras essenciais

- Deduplicar prioritariamente por identificador da origem, telefone normalizado, domínio e combinação nome/endereço.
- Não abordar novamente uma empresa dentro de uma janela configurável.
- Registrar o motivo exato de cada descarte.
- Aplicar timeout e retentativas independentes por etapa.
- Limitar concorrência e volume de mensagens por conexão.
- Manter o template e a configuração usados como snapshot da operação.
- Nunca armazenar tokens em código, logs ou eventos.
- O painel recebe progresso por eventos em tempo real, com fallback para atualização periódica.

## Primeiro recorte funcional

1. Login e funções administrador/operador.
2. Nova operação manual ou agendada.
3. Fila assíncrona com retomada.
4. Busca, deduplicação e análise digital.
5. Geração, validação e deploy.
6. Envio automático ou aprovação humana por operação.
7. Visão geral, lista de empresas, histórico e configurações.
