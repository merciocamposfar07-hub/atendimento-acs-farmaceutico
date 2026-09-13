# Registro canônico — Tarefa 15 / Navegação interna e Voltar

Data de validação: 12/09/2026

## Objetivo

Fazer o retorno dos módulos para a Central do Conecta Saúde Comunitária depender da navegação interna do próprio aplicativo, e não do histórico imprevisível do Safari/iPhone.

## Contrato canônico

Fluxo:

`Central autenticada → abrir módulo/rota no shell → usar Voltar → ocultar rota atual → retornar à mesma Central → reabrir rota já visitada preservando o frame e o estado carregado.`

Regras consolidadas:

- `history.back()` não é utilizado pelo `backToCentral()` dos módulos;
- quando o módulo está incorporado ao shell, a seta Voltar chama `window.parent.ConectaCentralShellV1.voltar()`;
- fora do shell, o fallback usa `location.replace(centralUrl())`, evitando empilhar histórico de navegação;
- fechar um módulo não executa `resetModuleShell()`, não descarrega iframe e não limpa sessão;
- proteção contra alterações não salvas permanece ativa;
- o shell passa a distinguir rota normal e variantes pela `routeId`;
- Prontuários abre como rota interna de Moradores com `view=prontuarios&all=1`;
- Pendências abre como rota interna de Suporte com `view=pending`;
- rotas variantes mantêm frames independentes, permitindo preservar DOM, filtros, rolagem e demais estados já carregados;
- mudança de área, logoff explícito e recusa real de autenticação continuam sendo os eventos estruturais que podem resetar o shell;
- nenhuma alteração de backend Apps Script foi necessária.

## Arquivos de produção atingidos

- `central-administrativa-tacs.js`
- `central-administrativa-tacs.html`
- `teste-v1/painel-moradores-v2.html`
- `painel-suporte-moradores-v2.html`
- `painel-oficial-recados-campanhas.html`
- `painel-oficial-agendas-vagas.html`
- `painel-oficial-profissionais-servicos.html`
- `painel-oficial-tacs-areas.html`
- `painel-oficial-organizacoes-municipios.html`
- `teste-v1/painel-profissionais-servicos-v1.html`
- `teste-v1/painel-tacs-areas-v1.html`

## Gate específico

`TAREFA_15_NAVEGACAO_INTERNA_OK`

O gate comprova:

- marcador `TAREFA_15_NAVEGACAO_INTERNA_V1`;
- API `voltar:closeViewer`;
- ausência de `history.back()` no contrato de retorno;
- fallback standalone por `location.replace(centralUrl())`;
- Prontuários e Pendências dentro do shell;
- separação de rota por `routeId`;
- preservação do frame ao voltar;
- manutenção da proteção contra alterações não salvas.

## Compatibilidade com tarefas anteriores

Durante a regressão, três gates históricos ainda verificavam assinaturas/versionamento anteriores do shell. Eles foram alinhados ao contrato atual sem alterar a lógica de produção:

1. `test_central_admin_performance_v1.js` — passou a aceitar o host persistente por rota;
2. `test_safari_bfcache_central_v1.js` e `test_tarefa10_sessao_shell_persistente.js` — passaram a aceitar `routeId`;
3. `test_tarefa12_cache_frescor.js` — passou a aceitar a revisão `20260912-task15-navigation-v1`.

As tentativas intermediárias foram bloqueadas somente por esses contratos históricos:

- run `34729087312`;
- run `34729147803`;
- run `34729263597`.

## Validação final

Workflow de homologação final:

- run: `34729325418`
- resultado: `success`
- gate da Tarefa 14: `success`
- gate da Tarefa 15: `success`
- regressão integral / `npm test`: `success`
- sintaxe: `success`
- regras críticas: `success`
- homologação interna: `V101_INTERNO_APROVADO=SIM`

GitHub Pages do código validado:

- run: `34729320071`
- resultado: `success`

Backend:

- alterado: não
- Apps Script: permanece na versão `208`

## Estado final

**TAREFA 15 VALIDADA INTERNAMENTE, PUBLICADA E CANONIZADA.**

A Tarefa 16 não foi iniciada neste registro.
