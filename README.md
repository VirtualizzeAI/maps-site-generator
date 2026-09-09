# Maps Site Generator

Sistema da Virtualizze para localizar empresas no Google Maps, gerar sites com GPT e publicá-los na Vercel.

## Objetivo

Centralizar e acompanhar o processo completo:

1. Buscar empresas no Google Maps.
2. Coletar e organizar os dados públicos relevantes.
3. Selecionar empresas para processamento.
4. Gerar conteúdo e estrutura do site com GPT.
5. Validar o resultado antes da publicação.
6. Publicar o site na Vercel.
7. Acompanhar status, erros e histórico em uma interface.

## Status

Projeto inicializado. O script Python existente ainda será analisado antes da definição da arquitetura, dependências e interface.

## Próxima etapa

Adicionar o script Python atual para mapear:

- entradas, saídas e dependências;
- etapas que podem ser automatizadas;
- operações que precisam de aprovação humana;
- modelo de dados e persistência;
- integração com Google Maps, OpenAI e Vercel;
- estados exibidos na interface de acompanhamento.

## Segurança

Credenciais e tokens devem ser configurados por variáveis de ambiente. Nunca envie arquivos `.env`, chaves de API ou tokens ao repositório.
