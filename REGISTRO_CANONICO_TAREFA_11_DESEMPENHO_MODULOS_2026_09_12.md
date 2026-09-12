# Registro canônico — Tarefa 11 — Desempenho dos módulos

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E PUBLICADA

## Objetivo exclusivo
Ao tocar em um módulo do Conecta Saúde Comunitária:
- o shell responde imediatamente;
- o último estado confirmado da sessão atual é exibido primeiro quando disponível;
- a consulta real ao servidor ocorre em paralelo;
- dados do cache permanecem somente para leitura até a confirmação remota;
- quando a resposta remota é idêntica ao estado já mostrado, a lista principal não é reconstruída;
- quando existem mudanças, o módulo aplica o novo resultado.

## Núcleo de desempenho
`conecta-module-core-v1.js` passa a fornecer `performance.prime` e `performance.commit`.

O cache desta tarefa:
- usa `sessionStorage`;
- é separado por perfil/modo, área e módulo;
- remove campos de autenticação, PIN, quickKey e chave de confiança;
- não substitui a sessão nem a autoridade do servidor;
- não confirma gravações.

## Módulos cobertos
Agendas, Moradores, Profissionais, Recados/Campanhas, Suporte aos Moradores, TACS/Áreas e Municípios/Organizações.

## Limites desta tarefa
- referência de versão/frescor do cache permanece para a Tarefa 12;
- deduplicação de requisições permanece para a Tarefa 13;
- regra de timeout sem destruir sessão permanece para a Tarefa 14;
- nenhuma alteração de backend Apps Script foi necessária nesta implementação.

## Gate obrigatório
`scripts/test_tarefa11_desempenho_modulos.js`

Saída esperada:
`TAREFA_11_DESEMPENHO_MODULOS_OK`

A Tarefa 11 só será encerrada depois da suíte integral, workflow de desempenho e GitHub Pages concluírem com sucesso.


## Resultado técnico verificado
- gate específico `TAREFA_11_DESEMPENHO_MODULOS_OK`: **aprovado**;
- suíte integral: **aprovada**;
- `QUALITY_GATE_V101_OK`: **aprovado**;
- homologação interna V101: **100%**, workflow `34725085208`;
- sintaxe dos componentes de desempenho: **aprovada**;
- regras críticas: **aprovadas**;
- GitHub Pages do código final: **success**, run `34725081013`;
- backend Apps Script: **não alterado**;
- versão de produção do Apps Script: **208**, sem consumo de nova versão.

A primeira execução `34724934546` foi bloqueada por assert histórico que exigia o rerender antigo de Agendas. A execução `34725019022` confirmou suíte e gate novos, mas revelou checagens estáticas legadas no workflow. Essas checagens foram atualizadas para os contratos atuais sem remover proteção funcional. A execução final `34725085208` passou integralmente.

## Fechamento
A **Tarefa 11 está validada internamente e publicada**. A Tarefa 12 permanece responsável pela referência de versão/frescor do cache; a Tarefa 13 pela deduplicação de requisições; a Tarefa 14 pela preservação de sessão em timeout.
