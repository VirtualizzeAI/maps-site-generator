# Maps Site Generator

Sistema da Virtualizze para buscar empresas, analisar presença digital, gerar sites com GPT, publicar na Vercel e enviar a abordagem pelo WhatsApp.

## Fluxo

1. O usuário define nicho, cidade, quantidade e execução manual ou agendada.
2. O sistema compara cada resultado com o histórico global armazenado no Supabase.
3. Empresas já prospectadas são bloqueadas antes da análise, geração e envio.
4. Uma análise aprofundada verifica site, redes e qualidade da presença digital.
5. Empresas inelegíveis são descartadas com o motivo registrado.
6. A IA gera o site e a mensagem para as empresas aprovadas.
7. O site é validado e publicado na Vercel.
8. A URL publicada é inserida na mensagem.
9. Conforme a configuração da operação, a mensagem é enviada automaticamente ou aguarda aprovação humana.
10. Toda a execução fica registrada por empresa, usuário, horário e configuração usada.

## Arquitetura definida

- interface Next.js publicada na Vercel;
- Supabase Auth, PostgreSQL, Realtime e Storage;
- API, scheduler e workers Python executados separadamente;
- Vercel para publicar os sites gerados;
- Evolution API para o WhatsApp;
- deduplicação global e transacional para garantir uma única prospecção por empresa.

Os detalhes estão em [`docs/architecture.md`](docs/architecture.md).

## Estado do projeto

- Protótipo Python original, sem credenciais, em [`prototype/`](prototype/).
- Arquitetura proposta em [`docs/architecture.md`](docs/architecture.md).
- Protótipo navegável do painel: https://virtualizze-prospector.virtualizzeautomacao.chatgpt.site

O painel atual usa dados demonstrativos para validar o fluxo e a experiência. A próxima fase liga a interface ao backend, Supabase, filas e integrações reais.

## Segurança

Configure tokens exclusivamente por variáveis de ambiente. Nunca envie arquivos `.env`, chaves de API ou tokens ao repositório.

As credenciais que estavam no protótipo original precisam ser revogadas e substituídas antes de continuar o desenvolvimento.
