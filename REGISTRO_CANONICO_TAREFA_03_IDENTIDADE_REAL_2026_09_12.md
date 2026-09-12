# Registro canônico — Tarefa 03 — Identidade real após o acesso

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 201

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


## Resultado técnico verificado
- gate específico `TAREFA_3_IDENTIDADE_REAL_OK`: **aprovado**;
- suíte integral: **aprovada** no RETRY_3;
- workflow Apps Script: **success**, run `34718306192`;
- versão anterior do deployment principal: `200`;
- nova versão criada e implantada: **`201`**;
- health check: **aprovado na primeira tentativa** para moradores, território, CSV, manutenção, isolamento, agendas Japaranduba/Matias, painéis públicos e conteúdo;
- GitHub Pages do disparo RETRY_3: **success**, run `34718300856`;
- o limite de versões foi saneado pelo usuário, preservando a faixa recente `189–199`; versões ativas antigas permanecem protegidas;
- workflow permanece corrigido para criar somente uma nova versão por implantação, usando a versão anteriormente implantada como rollback.

## Fechamento
A **Tarefa 3 está validada internamente, implantada e registrada canonicamente**. O reconhecimento persistente do aparelho, a lógica específica do segundo acesso e o modo diagnóstico administrativo continuam fora do escopo desta tarefa e permanecem reservados às tarefas seguintes.

A validação global em dispositivos reais permanece concentrada na etapa obrigatória de testes finais do projeto e não altera o resultado técnico desta Tarefa 3.