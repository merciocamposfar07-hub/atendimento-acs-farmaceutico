# Registro canônico — Botão Atualizar do Portal TACS

**Data de aprovação visual:** 13/09/2026  
**Escopo:** Portal TACS público  
**Status:** APROVADO EM DISPOSITIVO PELO USUÁRIO

## Modelo canônico

O botão de atualizar página no canto superior direito deve permanecer com estas características:

- círculo de 50 × 50 px;
- posição superior direita já existente;
- fundo azul-petróleo `#073a55`;
- borda branca semitransparente;
- seta interna exatamente `↻`;
- seta centralizada vertical e horizontalmente;
- comportamento funcional de atualização preservado;
- sem texto visível adicional dentro do botão.

A referência visual aprovada é a tela confirmada pelo usuário em 13/09/2026 às 21:32.

## Fonte de verdade no código

Arquivo:

`portal-institucional-suporte-v1.js`

Identificador de contrato:

`CANON_PORTAL_TACS_REFRESH_V1`

Regras obrigatórias:

`#portalTacsAtualizarPaginaV1` mantém 50 × 50, círculo e centralização flex.

`#portalTacsAtualizarPaginaV1::before` mantém:

`content:"↻"; display:block; font-size:26px; line-height:1; color:#fff`

## Proteção contra regressão

O arquivo:

`scripts/test_portal_release_integrity_v1.js`

agora falha se:

- o botão deixar de ser 50 × 50 e circular;
- a centralização for retirada;
- a seta deixar de ser exatamente `↻`;
- o marcador canônico desaparecer do código.

Esse teste já faz parte da suíte principal `npm test`.

## Regra de manutenção

Este bloco é isolado. Alterações em cards, rodapé, cabeçalho, navegação, PIN, UBS, áreas, moradores, agendas, serviços ou demais painéis não devem modificar este botão.

Qualquer mudança futura neste modelo exige pedido explícito do usuário.
