# Registro canônico — Tarefa 12 — Versão e frescor do cache

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E PUBLICADA NO GITHUB PAGES

## Objetivo exclusivo
Impedir dados congelados ou tratados como atuais apenas porque existe cache local.

Contrato:
`cache versionado → pintura rápida somente leitura → consulta remota obrigatória → comparar versão/fingerprint → aplicar mudança quando houver → liberar estado crítico somente após confirmação remota atual`.

## Regras implementadas
- cache do núcleo passa ao schema 2;
- cada snapshot guarda `cacheVersionReference`, `confirmedAt` e `checkedAt`;
- quando a resposta contém versão/data explícita, ela é preferida como referência;
- quando não existe versão explícita, o fingerprint do conteúdo funciona como referência de versão;
- cache legado schema 1 pode manter continuidade visual, mas é marcado como não versionado, stale, não autoritativo e exigindo remoto;
- cache nunca define sozinho que a informação crítica está atual;
- Agendas e Profissionais não podem mais encerrar a carga usando apenas a leitura compartilhada de 5 segundos;
- no caminho do core, Agendas, Profissionais e Recados deixam de reutilizar fallback local antigo sem referência de versão;
- todos os módulos continuam consultando o servidor depois de pintar cache;
- alterações críticas continuam bloqueadas até resposta remota confirmada.

## Correção pós-auditoria da Tarefa 11
Durante a preparação desta tarefa foi identificado que o atalho `sharedAdminRead` de Agendas e Profissionais podia retornar antes da consulta remota própria. O gate anterior não cobria esse caminho.

A correção preserva a aceleração visual, mas transforma esse dado compartilhado em leitura somente de transição; a chamada ao servidor continua obrigatória. O gate da Tarefa 11 foi reforçado para impedir regressão futura.

## Fora do escopo
- deduplicação de chamadas permanece na Tarefa 13;
- regra de timeout que preserva sessão permanece na Tarefa 14;
- Apps Script não foi alterado nesta tarefa.

## Gate obrigatório
`scripts/test_tarefa12_cache_frescor.js`

Saída esperada:
`TAREFA_12_CACHE_FRESCOR_OK`

A Tarefa 12 só será concluída após gate específico, suíte integral, quality gate e GitHub Pages passarem no estado final do `main`.


## Resultado técnico verificado
- gate pós-auditoria da Tarefa 11: `TAREFA_11_DESEMPENHO_MODULOS_OK` — **aprovado**;
- gate específico da Tarefa 12: `TAREFA_12_CACHE_FRESCOR_OK` — **aprovado**;
- suíte integral: **aprovada**;
- quality gate: `QUALITY_GATE_V101_OK`;
- homologação interna: `V101_INTERNO_APROVADO=SIM`, exigência interna 100%;
- workflow de desempenho final: **success**, run `34725768331`;
- GitHub Pages do mesmo estado validado: **success**, run `34725763575`;
- backend Apps Script: **não alterado** nesta tarefa;
- versão Apps Script permanece **208**.

## Fechamento
A exceção encontrada na Tarefa 11 foi corrigida e passou novamente pelo gate completo. Com isso, a Tarefa 11 fica revalidada após auditoria.

A **Tarefa 12 está concluída tecnicamente**: cache versionado/fresco, cache não autoritativo, servidor obrigatório após pintura local, diferenças aplicadas após confirmação e operações críticas protegidas até resposta remota atual.

A deduplicação de requisições permanece reservada à Tarefa 13.
