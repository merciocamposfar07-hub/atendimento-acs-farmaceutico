# Registro — correção do retorno do Portal TACS à Central

Data: 13/09/2026

## Escopo isolado
Correção exclusivamente do retorno do Portal TACS para os painéis da Central Administrativa e da disputa entre controles do topo.

## Inconsistência encontrada
Dois blocos diferentes tentavam controlar o retorno:
- `portal-auto-update.js` criava `#portalTacsVoltarCentralV1`;
- `central-back-button-v1.js` substituía/criava outro controle depois.

Isso permitia mudança de aparência durante o carregamento e criava uma janela em que o clique podia usar a navegação direta em vez do shell administrativo já autenticado.

## Correção aplicada
- `central-back-button-v1.js` passa a ser o único dono visual do retorno estável;
- o controle legado concorrente é removido;
- `portal-auto-update.js` não cria um segundo botão quando a barra estável já existe;
- mesmo durante a pré-carga, o clique tenta primeiro `window.parent.ConectaCentralShellV1.voltar()`;
- a navegação direta fica somente como fallback fora do shell;
- o bloco de retorno deixou de reestilizar/manipular o botão circular de atualização;
- o script institucional do topo recebeu cache-bust próprio para evitar mistura entre versões antigas e novas.

## Não alterado
Não houve alteração em PIN, autenticação, permissões, dados, UBS, TACS, moradores, agendas, vagas, backend ou Apps Script.

## Validação interna
- sintaxe dos dois JavaScripts: OK;
- simulação de clique antes da instalação do controle definitivo: voltou pelo shell, sem navegação direta;
- simulação após instalação do controle definitivo: voltou pelo shell, sem duplicidade;
- reinvocação do auto-update: não recriou o botão legado;
- `index.html` e `portal-version.json` sincronizados na release `1297ed43fcf5`.

Status: **PUBLICADA EM MAIN PARA TESTE NO DISPOSITIVO — ainda não marcada como validada pelo usuário.**
