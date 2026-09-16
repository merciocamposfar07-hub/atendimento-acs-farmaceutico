# Registro canônico — quadro vazio na Central UBS

Data: 2026-09-16

## Sintoma
Na Central da UBS, um retângulo/iframe vazio aparecia abaixo do conteúdo principal.

## Causa
O `viewerFrame` base podia permanecer liberado após reset/retorno do shell, mesmo sem painel de frame aberto.

## Correção isolada
Bloco: `CORRECAO_CIRURGICA_QUADRO_VAZIO_UBS_2026_09_16_V1`

Arquivos:
- `central-administrativa-tacs.js`
- `central-administrativa-tacs.html`

Regras:
- reset do shell mantém o `viewerFrame` oculto;
- ao voltar à Central, todos os frames são ocultados;
- a classe `csc-shell-viewer` é removida no fechamento;
- fora do estado `viewer-open`, o viewer e seus iframes não participam do layout;
- os frames permanecem disponíveis para cache/pré-carregamento e só são exibidos por `showShellFrame()`.

## Fora do escopo
Não altera dados, permissões, isolamento territorial, UBS, autenticação, conteúdo dos painéis ou pré-carregamento.
