# Registro canônico — Tarefa 03 — Identidade real após o acesso

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; VALIDAÇÃO INTEGRAL EM ANDAMENTO

## Objetivo exclusivo da Tarefa 3
Após autenticação, o Conecta Saúde Comunitária deve exibir a identidade humana real do acesso, composta por:

`nome completo — perfil cadastrado`

Exemplos canônicos:
- `Mércio José Campos dos Santos — Administrador + TACS`;
- `Manuel … — TACS`;
- `Júlia Maria da Silva — UBS`.

## Regras
- não reduzir combinações ao rótulo genérico Administrador, TACS ou UBS;
- Administrador usa o cadastro autenticado atual e seu perfil real;
- TACS usa o cadastro territorial autenticado e seu perfil real;
- UBS devolve e apresenta o perfil efetivamente cadastrado, inclusive combinações;
- Morador autenticado apresenta nome + Morador;
- a Tarefa 3 não cria vínculo persistente de aparelho, não muda o segundo acesso e não implementa modo diagnóstico administrativo.

## Alterações funcionais
- `central-administrativa-tacs.js`: identidade autenticada passa a usar nome + perfil real;
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`: primeiro acesso UBS devolve `ubs.perfil` real, não `UBS` fixo;
- `conecta-acesso-unificado-v1.js`: confirmação UBS exibe nome + rótulo completo do perfil;
- `conecta-morador-session-v1.js`: cabeçalho autenticado identifica `nome — Morador`.

## Gate obrigatório
`scripts/test_tarefa3_identidade_real.js`

Saída esperada:
`TAREFA_3_IDENTIDADE_REAL_OK`

A tarefa só pode ser marcada como validada internamente após o gate específico, a suíte integral, o deploy/health check do Apps Script e a publicação do GitHub Pages passarem com sucesso.
