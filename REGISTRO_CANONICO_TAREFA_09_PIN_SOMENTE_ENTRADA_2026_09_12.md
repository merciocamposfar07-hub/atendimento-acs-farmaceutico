# Registro canônico — Tarefa 09 — PIN somente na entrada do Conecta

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

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
