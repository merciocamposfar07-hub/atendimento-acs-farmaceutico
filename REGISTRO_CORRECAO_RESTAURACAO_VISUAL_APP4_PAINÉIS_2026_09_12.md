# Registro de correção — Restauração visual App4 dos painéis

Data: 12/09/2026

## Motivo

Durante a migração funcional das Tarefas 16–18, o shell persistente passou a exibir uma barra própria `← Central + título` sobre os painéis.

Essa alteração degradou o contrato visual já aprovado em:

- `DECISAO_CANONICA_UI_CENTRAL_APP_INSTITUCIONAL_2026_09_10.md`;
- referência `4 • App institucional`;
- revisão App4/R6 de tela única.

Efeitos indevidos identificados:
- barra superior adicional com borda ciano;
- retorno duplicado em painéis que já possuíam seta App4;
- ausência do ícone oficial nos três módulos nativos;
- textos técnicos “Módulo nativo do Conecta” expostos ao usuário;
- diferença visual entre painéis nativos e painéis ainda carregados em frame.

## Correção aplicada

O shell dos painéis volta a ter **um único cabeçalho visual App4**:

- ícone oficial canônico à esquerda;
- marca `CONECTA SAÚDE COMUNITÁRIA`;
- título específico do painel;
- uma única seta de retorno à Central, à direita;
- fundo contínuo `#071827`;
- sem faixa/borda estrutural superior ou inferior;
- sem botão textual `← Central`.

Nos painéis legados embutidos:
- `#cscInstitutionalAppbar` interno é ocultado somente quando o painel está dentro do shell;
- o painel standalone continua preservando seu cabeçalho App4;
- `#portalTacsBackCentralV1` permanece oculto no shell;
- não há dois controles de voltar simultâneos.

Nos módulos nativos:
- Agendas, Moradores e Profissionais continuam funcionais no host nativo;
- textos técnicos de migração foram retirados da interface;
- Moradores recuperou os textos visuais anteriores ao módulo nativo;
- nenhuma regra de leitura, gravação, sessão, PIN, área ou backend foi alterada.

## Arquivos de produção alterados

- `central-administrativa-tacs.html`
- `central-administrativa-tacs.js`
- `conecta-agendas-native-v1.js`
- `conecta-moradores-native-v1.js`
- `conecta-profissionais-native-v1.js`

## Proteção de regressão

Gate:
`RESTAURACAO_APP4_PAINEIS_OK`

Teste:
`scripts/test_restauracao_app4_paineis_v1.js`

O gate exige:
- referência ao Protótipo 4;
- ícone oficial presente;
- seta única à direita;
- ausência de `← Central` textual;
- ausência da borda estrutural do viewer;
- ocultação do cabeçalho interno duplicado em frames;
- ausência de “Módulo nativo do Conecta” na UI;
- preservação das Tarefas 16, 17 e 18.

## Validação

Workflow oficial:
- run `34733744289`
- resultado: `success`

GitHub Pages:
- run `34733739185`
- resultado: `success`

Backend:
- não alterado;
- Apps Script permanece versão `208`.

## Estado

**RESTAURAÇÃO VISUAL APP4 VALIDADA E PUBLICADA.**

Esta correção não cria nova tarefa e não altera a sequência original 1–18.
