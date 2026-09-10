# Arquitetura proposta

## Objetivo

Executar operações de prospecção configuráveis, manuais ou agendadas, com rastreabilidade completa desde a busca até o envio pelo WhatsApp, sem abordar a mesma empresa mais de uma vez.

## Plataforma definida

- **Interface:** Next.js publicada na Vercel.
- **Autenticação, banco e tempo real:** Supabase Auth, PostgreSQL e Realtime.
- **Backend de operações:** API e workers Python executados fora das funções de curta duração da Vercel.
- **Publicação dos sites gerados:** Vercel.
- **Canal de envio:** Evolution API.

O frontend acessa o Supabase com a chave pública e políticas RLS. Chaves administrativas, OpenAI, Serper, Vercel e Evolution ficam somente no backend Python. O backend usa a `service_role` do Supabase e nunca a expõe ao navegador.

## Fluxo de uma operação

1. O usuário informa nicho, cidade, quantidade e horário.
2. A busca retorna candidatos e salva os dados brutos.
3. Cada candidato é comparado com a base global de empresas.
4. Se a empresa já tiver sido prospectada, ela entra na operação como `blocked_history` e não segue para análise, geração ou envio.
5. O analisador verifica site, redes, qualidade da presença digital e sinais de oportunidade.
6. Empresas inelegíveis são descartadas com um motivo registrado.
7. Para empresas elegíveis, a IA produz o site e a mensagem.
8. O site é validado e publicado na Vercel.
9. A URL publicada é inserida na mensagem.
10. No modo automático, a mensagem é enviada pelo WhatsApp configurado.
11. No modo revisão humana, a mensagem aguarda edição ou aprovação.
12. Eventos, tentativas e erros permanecem disponíveis na linha do tempo.

## Separação de responsabilidades

- **Vercel / interface:** painel, formulários, consultas e ações do usuário.
- **Supabase Auth:** identidade e permissões de administrador/operador.
- **Supabase PostgreSQL:** fonte de verdade de empresas, operações, resultados e auditoria.
- **Supabase Realtime:** atualização do progresso na interface.
- **Supabase Storage:** HTML, capturas e artefatos quando necessário.
- **API Python:** valida entradas, cria operações e expõe ações do painel.
- **Workers Python:** busca, análise digital, geração, deploy e envio.
- **Scheduler:** dispara operações agendadas e registra cada execução.

## Estados principais

`scheduled` → `searching` → `analyzing` → `generating` → `deploying` → `awaiting_approval` ou `sending` → `completed`

Qualquer etapa pode registrar `failed`, `retrying`, `discarded`, `blocked_history` ou `cancelled`.

O status da operação e o status de cada empresa dentro da operação são armazenados separadamente.

## Modelo de dados inicial

### profiles

Perfil ligado ao Supabase Auth, função, organização e estado de acesso.

### companies

Cadastro canônico da empresa: nome normalizado, telefone, endereço, coordenadas, domínio, perfis sociais, identificadores externos, primeira descoberta e data da primeira prospecção.

### company_identities

Identidades normalizadas usadas na deduplicação. Deve possuir unicidade por tipo e valor para `google_place_id`, telefone E.164, domínio e impressão de nome/endereço.

### operations

Snapshot imutável da execução: usuário, nicho, cidade, quantidade, modo de aprovação, template, conexão WhatsApp, agendamento e datas.

### operation_companies

Relação entre operação e empresa. Guarda estágio, decisão, motivo de descarte ou bloqueio, pontuação, site publicado e mensagem final.

### digital_analyses

Evidências encontradas, URLs consultadas, resultado das verificações, pontuação e versão das regras usadas.

### generated_sites

Artefato, prompt, modelo, versão, URL Vercel, projeto/deployment e status de publicação.

### messages

Template resolvido, destinatário, modo, aprovação, usuário aprovador, identificador da Evolution e status de entrega.

### events

Linha do tempo append-only para auditoria e atualização da interface em tempo real.

### integrations

Referências das conexões de Serper, OpenAI, Vercel e Evolution. Segredos ficam criptografados no backend ou em seu gerenciador de variáveis e nunca são retornados integralmente para a interface.

## Regra global contra duplicidade

- Deduplicar primeiro por `google_place_id`; depois por telefone normalizado, domínio e combinação normalizada de nome/endereço.
- Registrar toda ocorrência na `operation_companies`, inclusive quando bloqueada.
- Antes de gerar o site ou enviar a mensagem, executar uma verificação transacional no Supabase.
- O primeiro envio grava `companies.prospected_at` e a operação responsável.
- Uma restrição única/claim transacional impede dois workers simultâneos de prospectarem a mesma empresa.
- Empresas já prospectadas nunca voltam à fila de geração ou envio em operações futuras.
- Falhas que ocorreram antes de qualquer envio podem ser retomadas sem quebrar a regra de “uma prospecção por empresa”.

## Regras adicionais

- Registrar o motivo exato de cada descarte ou bloqueio.
- Aplicar timeout e retentativas independentes por etapa.
- Limitar concorrência e volume de mensagens por conexão.
- Manter o template e a configuração usados como snapshot da operação.
- Nunca armazenar tokens em código, logs ou eventos.
- Usar Supabase Realtime para o progresso, com atualização periódica como fallback.
- Aplicar RLS por organização para usuários comuns; somente o backend usa `service_role`.

## Primeiro recorte funcional

1. Supabase Auth e funções administrador/operador.
2. Nova operação manual ou agendada.
3. Fila assíncrona com retomada.
4. Busca, deduplicação global e análise digital.
5. Geração, validação e deploy na Vercel.
6. Envio automático ou aprovação humana por operação.
7. Visão geral, lista de empresas, histórico e configurações.
