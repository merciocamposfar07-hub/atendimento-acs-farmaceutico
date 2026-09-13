# Registro canônico — Tarefa 17 / Migração definitiva de Moradores

Data de validação: 12/09/2026

## Escopo autorizado

A Tarefa 17 executa o **segundo bloco da migração definitiva painel a painel**, seguindo a ordem canônica após Agendas e vagas:

1. Agendas e vagas — Tarefa 16;
2. Moradores — Tarefa 17.

Nesta tarefa:
- a **rota normal de Moradores** é migrada para superfície nativa da Central;
- **Prontuários** permanece deliberadamente na rota/frame legado, fora do escopo desta etapa;
- os demais painéis permanecem inalterados.

## Objetivo

Retirar o painel vivo de Moradores da arquitetura de página completa hospedada em iframe no fluxo normal da Central, preservando integralmente:
- sessão única;
- contexto territorial;
- seleção de área;
- busca real;
- cadastro e edição;
- CPF e CNS;
- situação cadastral;
- comparação e consolidação de duplicidades;
- referência familiar já suportada na busca;
- cache/frescor;
- deduplicação de leitura;
- proteção contra gravação sem permissão;
- retorno interno à Central;
- proteção de alterações ainda não salvas.

## Contrato canônico

Fluxo normal:

`Central autenticada → Moradores → host nativo próprio → cache/estado da base → sincronização remota → busca/cadastro/edição → gravação autorizada → atualização da base → Voltar → mesma Central`

Regras consolidadas:

- Moradores é o segundo painel da migração definitiva;
- a rota normal `moradores` usa `showNativeMoradores()`;
- o módulo não usa iframe como arquitetura visual do painel;
- o transporte existente continua usando iframe invisível somente como ponte técnica de POST quando necessário;
- Prontuários `view=prontuarios` permanece no shell de frame legado nesta tarefa;
- Agendas e vagas continua nativa e sua superfície/estado não é sobrescrita por Moradores;
- Moradores possui superfície própria e persistente: `#nativeMoradoresHost`;
- o módulo nativo não possui login/PIN próprio;
- sessão, perfil e área continuam vindo de `ConectaModuleCoreV1`;
- a `areaId` só é injetada na sessão do core quando realmente existe, evitando sobrescrever a área canônica com `undefined`;
- busca real permanece em `admin_moradores_buscar`;
- criação/edição permanece em `admin_morador_salvar`;
- situação cadastral permanece em `admin_morador_situacao`;
- consolidação permanece em `admin_morador_consolidar`;
- status/permissões permanecem em `admin_moradores_status`;
- CPF de 11 dígitos e CNS de 15 dígitos continuam validados;
- compatibilidade do CPF legado com zero inicial continua preservada;
- duplicidades de áreas distintas não podem ser classificadas como o mesmo morador;
- troca de área continua vinculada à seleção territorial autorizada;
- alterações no formulário marcam `data-tacs-dirty` e continuam protegidas pelo Voltar;
- gravação confirmada limpa o estado de edição pendente;
- o transporte mantém a versão pública `3.6.1` para compatibilidade;
- extensão nativa registrada em `nativeCompat: task17-moradores-native-v1`;
- nenhuma alteração de backend Apps Script foi necessária.

## Arquivos de produção

Criados:
- `conecta-moradores-native-v1.js`
- `conecta-moradores-native-v1.css`

Alterados:
- `teste-v1/painel-moradores-transport-v2.js`
- `central-administrativa-tacs.js`

Preservado como fallback/rota especial:
- `teste-v1/painel-moradores-v2.html`
- rota Prontuários `view=prontuarios`.

## Gate específico

`TAREFA_17_MORADORES_NATIVOS_OK`

O gate comprova:
- marcador `TAREFA_17_MORADORES_NATIVOS_V1`;
- rota normal de Moradores nativa;
- Prontuários ainda fora do escopo;
- Agendas nativas preservadas;
- ausência de iframe visual próprio no módulo nativo;
- ausência de login/PIN próprio;
- campos de nome, nascimento, CPF e CNS presentes;
- busca, cadastro/edição, situação e consolidação preservados;
- validação CPF/CNS e CPF legado preservadas;
- isolamento territorial preservado;
- core continua dono de sessão, cache e requisições;
- proteção de alterações não salvas preservada;
- nenhum painel da Tarefa 18 foi iniciado.

## Compatibilidade com tarefas anteriores

Durante a homologação, gates históricos ainda esperavam contratos anteriores. Foram ajustados sem remover proteções funcionais:

1. `test_territorio_dom.js` exigia a versão pública `3.6.1` do transporte:
   - a versão pública foi preservada;
   - a extensão nativa passou a usar campo separado `nativeCompat`.

2. `test_tarefa8_modulos_core_contexto.js` exigia a chamada literal com `areaId:selectedAreaId||undefined`:
   - o gate foi alinhado à forma segura que só acrescenta `areaId` quando existe.

3. `test_tarefa16_agendas_nativas.js` proibia a existência da Tarefa 17 na Central:
   - o gate passou a garantir que os arquivos próprios de Agendas não absorvam lógica da Tarefa 17, enquanto a Central pode avançar na sequência autorizada.

Execuções intermediárias que falharam apenas por contratos históricos:
- `34730650705`;
- `34730656840`;
- `34730701834`;
- `34730782937`;
- `34730851818`.

## Validação final

Workflow final:
- run: `34730914731`
- resultado: `success`
- Tarefa 14: `TAREFA_14_TIMEOUT_SESSAO_OK`
- Tarefa 15: `TAREFA_15_NAVEGACAO_INTERNA_OK`
- Tarefa 16: `TAREFA_16_AGENDAS_NATIVAS_OK`
- Tarefa 17: `TAREFA_17_MORADORES_NATIVOS_OK`
- quality gate: `QUALITY_GATE_V101_OK`
- homologação interna: `V101_INTERNO_APROVADO=SIM`

GitHub Pages do código validado:
- run: `34730907935`
- resultado: `success`

Backend:
- alterado: não
- Apps Script: permanece na versão `208`

## Commits principais da Tarefa 17

- `d94985986013e1bb0260242ca810066da2e48f18` — compatibilidade do transporte com host nativo;
- `797246d3236bbbda303117b087c5f8bd2642c561` — visual nativo;
- `7711ee0bbd80edea9c5dc31037c3ac7a3fd44a05` — módulo nativo de Moradores;
- `27461b781de85dbea104f9de5fa9595ed412184b` — roteamento nativo da Central;
- `0995ce869e1d8248d3d678f17988146e4ffc3805` — gate específico;
- `50636df88023e0eda01db5373a389ac5288f0347` — inclusão na regressão;
- `328db0298391c492696e44462f35673cd1482ba9` — workflow observando arquivos da Tarefa 17;
- `3ffe726cad849a08cfc27bbbe04361b6ea2c6374` — preservação da versão pública do transporte;
- `78a3699944dcfe3bdb2fa7fc0c197b74b1c6a0ae` — compatibilidade da área segura no gate da Tarefa 8;
- `8c6ae45b5242ae2258c4981ba3be36d681954017` — compatibilidade do gate da Tarefa 16;
- `2fd3a48557a9d20871ad0fac138651ceaa0eedb7` — gate 17 alinhado à versão pública preservada.

## Estado final

**TAREFA 17 — MORADORES NATIVOS VALIDADA INTERNAMENTE, PUBLICADA E CANONIZADA.**

Prontuários permanece fora deste escopo e os demais painéis não foram iniciados.
A próxima posição da ordem canônica é **Profissionais e serviços**, mas ela não é iniciada neste registro.
