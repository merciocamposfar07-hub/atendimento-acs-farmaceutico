# Registro canônico — Tarefa 09 — PIN somente na entrada do Conecta

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 207

## Objetivo exclusivo da Tarefa 9
A autenticação por PIN pertence somente à entrada do Conecta Saúde Comunitária. Depois da autenticação, os módulos recebem do núcleo a identidade, perfil, área, permissões e sessão já confirmados.

## Regras
- a Central permanece a autoridade de login e logoff;
- módulos não exibem campo de PIN nem seletor de perfil/login próprio;
- módulo aberto sem sessão canônica não tenta autenticar: orienta retorno à Central;
- módulos não podem criar, substituir, remover nem limpar os tokens globais Administrador/TACS;
- módulos não decidem o perfil autenticado; usam `ConectaModuleCoreV1.mode()` e o contexto publicado pela Central;
- handlers legados ainda presentes no código ficam bloqueados no runtime comum, evitando reescrita destrutiva dos painéis nesta etapa;
- shell persistente e roteamento interno definitivo permanecem reservados à Tarefa 10;
- migração definitiva painel a painel permanece reservada à Tarefa 16.

## Implementação
O bridge `conecta-module-core-v1.js` passa a aplicar um gate comum a todos os módulos:

1. esconde controles legados de autenticação;
2. intercepta cliques/submits de login antes dos handlers antigos;
3. bloqueia gravação/remoção/limpeza dos tokens globais pela página de módulo;
4. preserva a Central fora desse bloqueio;
5. quando falta sessão canônica, mostra apenas a orientação para voltar à Central, sem oferecer PIN local.

## Gate obrigatório
`scripts/test_tarefa9_pin_somente_entrada.js`

Saída esperada:
`TAREFA_9_PIN_SOMENTE_ENTRADA_OK`

A Tarefa 9 só será concluída após gate específico, suíte integral, implantação Apps Script/health checks e GitHub Pages passarem com sucesso.


## Resultado técnico verificado
- gate específico `TAREFA_9_PIN_SOMENTE_ENTRADA_OK`: **aprovado**;
- suíte integral: **aprovada** no workflow final;
- workflow Apps Script final: **success**, run `34723196310`;
- versão anterior do deployment principal: `206`;
- nova versão criada e implantada: **`207`**;
- health checks: **aprovados na primeira tentativa** para moradores, território, CSV, manutenção, isolamento, agendas Japaranduba/Matias, painéis públicos e conteúdo;
- versões ativas após o deploy: `6, 7, 9, 207`;
- GitHub Pages com código da Tarefa 9: **success**, run `34723391600`;
- execuções anteriores `34722437567` e `34723103101` foram interrompidas/canceladas antes do fechamento final e não constituem validação da tarefa.

## Fechamento
A **Tarefa 9 está validada internamente, implantada e registrada canonicamente**. A autenticação por PIN fica concentrada na entrada/Central; os módulos consomem a sessão e o contexto do núcleo e não mantêm autenticação paralela.

A Tarefa 10 permanece separada: ela tratará o shell persistente e a navegação entre Central e módulos sem reiniciar autenticação ou reconstruir a aplicação.


## Resultado técnico verificado
- gate específico `TAREFA_9_PIN_SOMENTE_ENTRADA_OK`: **aprovado**;
- suíte integral: **aprovada**;
- `QUALITY_GATE_V101_OK`: **aprovado**;
- workflow Apps Script definitivo: **success**, run `34723196310`;
- versão anterior: `206`;
- nova versão criada e implantada: **`207`**;
- health checks: **aprovados na primeira tentativa** para moradores, território, CSV, manutenção, isolamento, agendas Japaranduba/Matias, painéis públicos e conteúdo;
- versões ativas após a implantação: `6, 7, 9, 207`;
- GitHub Pages: **success**, run `34723459550`.

## Ajustes de regressão durante a validação
O primeiro run ficou preso em um teste legado de transporte que ainda tentava autenticar dentro do módulo Profissionais. O teste foi alinhado ao contrato da Tarefa 9 e passou. O teste DOM de Profissionais também foi atualizado para receber a sessão canônica da Central, sem chamar `admin_login` dentro do módulo.

Nenhuma dessas correções alterou a lógica funcional dos painéis; foram ajustes dos gates históricos ao fluxo já autorizado.

## Fechamento
A **Tarefa 9 está validada internamente, implantada e registrada canonicamente**. A Tarefa 10 fica liberada para implementar sessão única + shell persistente, sem reiniciar autenticação ao trocar de módulo.
