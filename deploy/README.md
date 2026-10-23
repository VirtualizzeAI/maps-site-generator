# Produção na VPS

Docker é usado somente em produção; o desenvolvimento local continua com Node.js e TypeScript.

## Fluxo

Push na `main` alterando backend ou deploy → testes e build → imagem no GHCR identificada por digest → SSH na VPS → Docker Compose atualiza uma única instância → verifica `/health`. Se a atualização falhar, o script tenta restaurar a imagem anterior. O frontend continua com deploy independente na Vercel.

## Preparação inicial

1. Instalar Docker Engine, plugin Compose e `flock` na VPS. Criar `/opt/stacks/maps-site-generator` e dar acesso ao usuário de deploy, que também precisa executar Docker. Esse acesso equivale a privilégios administrativos na VPS.
2. Criar `backend.env` nesse diretório a partir de `backend/.env.example`, com permissão 600. Preencher Supabase e banco existentes; migrations não são aplicadas automaticamente. Usar `PUBLIC_API_URL=https://apimsg.virtualizzeautomacao.com.br` e `FRONTEND_URL=https://msg.virtualizzeautomacao.com.br`. Manter inicialmente `INTEGRATIONS_MODE=mock`. Chaves ficam somente nesse arquivo, nunca na imagem ou no repositório.
3. Publicar a imagem uma primeira vez ou executar o workflow após configurar o acesso. Se o pacote GHCR for privado, autenticar Docker na VPS com uma credencial de leitura de pacotes; o login do runner não autentica a VPS. Alternativamente, tornar somente a imagem pública. Nenhum segredo deve ser incluído nela.
4. Configurar no GitHub o environment `production` e os secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` e `VPS_KNOWN_HOSTS`. A chave deve ser exclusiva do deploy. Obter e verificar a chave pública de host por um canal confiável; não desabilitar a validação de host SSH. O workflow usa porta SSH 22.
5. Apontar o DNS de `apimsg.virtualizzeautomacao.com.br` para a VPS.
6. Acrescentar `Caddyfile.fragment` ao Caddy existente, validar e recarregar sua configuração. O proxy existente usa rede host, portanto acessa `127.0.0.1:18000`. Liberar portas 80/443 para emissão e renovação de HTTPS. Não iniciar outro proxy disputando essas portas.
7. Na Vercel, definir `NEXT_PUBLIC_API_URL=https://apimsg.virtualizzeautomacao.com.br` e fazer novo deploy do frontend.

## Validação e operação

Confirmar `https://apimsg.virtualizzeautomacao.com.br/health`, login e CORS pelo painel. Antes de testar integrações reais, confirmar no painel que o modo global de teste do WhatsApp está ativo e conferir o número efetivo. Valores persistidos no banco podem prevalecer sobre os valores iniciais do ambiente. Não enviar mensagens como parte da validação do deploy.

Logs: `docker compose -f compose.yaml logs --tail 100 backend`, passando `BACKEND_IMAGE` com o conteúdo de `image.lock`. O volume `sites` preserva arquivos locais durante atualizações. Não executar `down -v`.

As atualizações reiniciam o processo e causam uma breve indisponibilidade. Não há deploy sem interrupção nem garantia de retomada de operações em andamento; publicar em períodos sem operações ativas até implementar drenagem e recuperação do worker. O rollback restaura a imagem, não desfaz efeitos externos nem alterações no banco. O healthcheck verifica o banco; após o deploy, saúde negativa exige monitoramento externo, pois `restart: unless-stopped` reinicia processos encerrados e não containers apenas marcados como unhealthy.

## Estado desta entrega

Arquivos preparados para revisão; a ativação exige secrets do GitHub, ambiente da aplicação, DNS e acesso administrativo ao Docker/proxy. Não considerar o deploy ativo até validar o workflow e o endpoint HTTPS. O terminal desta sessão não possui npm, não resolve github.com e não tem acesso ao socket Docker; testes e build devem ser executados no CI antes de integrar a mudança.
