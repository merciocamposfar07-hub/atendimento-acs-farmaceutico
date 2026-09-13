# Registro canônico — Tarefa 14 — Timeout não destrói sessão

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

## Objetivo exclusivo
Lentidão, timeout, falha de rede ou resposta remota não conclusiva não podem apagar a sessão do Conecta, devolver o usuário ao PIN nem esvaziar um painel que já possua último estado confirmado.

Fluxo:
`requisição remota → classificar falha → falha temporária: preservar sessão + manter último estado em somente leitura + permitir nova sincronização → recusa explícita de autenticação: permitir invalidação`.

## Contrato
- política oficial: `ConectaModuleCoreV1.sessionPolicy`;
- qualquer falha que não seja recusa explícita de autenticação é normalizada como `temporario:true` e `preservarSessao:true`;
- somente recusa explícita recebe `authRecusada:true`;
- timeout não remove token, não limpa contexto, não desmonta shell e não força retorno ao PIN;
- painel com snapshot confirmado mantém os dados visíveis em somente leitura enquanto a sincronização não é confirmada;
- operações críticas continuam bloqueadas até nova confirmação remota;
- a Central já preserva contexto/sessão em falhas não autoritativas e continua sendo a autoridade global;
- Profissionais e TACS/Áreas foram alinhados ao mesmo contrato para não invalidarem sessão em falha genérica;
- Agendas, Moradores, Recados/Campanhas, Suporte e Municípios preservam o último estado ou a sessão em falhas de leitura;
- navegação/back da Tarefa 15 não é iniciada aqui.

## Gate obrigatório
`scripts/test_tarefa14_timeout_sessao.js`

Saída esperada:
`TAREFA_14_TIMEOUT_SESSAO_OK`

Esta tarefa é de frontend/core. Nenhum arquivo `apps-script/` deve ser alterado e a produção deve permanecer no Apps Script **208** se a validação passar.
