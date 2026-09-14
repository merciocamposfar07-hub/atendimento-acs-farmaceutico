# Registro — Correção de desempenho dos painéis e barra inferior imediata

Data: 13/09/2026

## Escopo autorizado
Correção limitada ao tempo percebido de carregamento das informações internas dos painéis e ao atraso da barra inferior da Central Administrativa.

Não fazem parte desta correção: layout dos painéis, cadastro, perfis, permissões, PIN, áreas, UBS, TACS, moradores, vagas, regras de gravação ou backend Apps Script.

## Diagnóstico
O vídeo do iPhone mostrou a Central já desenhada enquanto a Saúde Geral permaneceu vários segundos em “Atualizando dados validados”. No código, a atualização visual aguardava quatro leituras remotas e a preparação dos módulos nativos era iniciada apenas depois de `window.load` + `requestIdleCallback` com timeout de até 3,5 s. A barra inferior também era criada somente no `DOMContentLoaded`, depois dos scripts externos do fim da página.

## Bloco isolado A — dados dos painéis
Arquivo: `central-administrativa-tacs.js`.

- último snapshot válido continua sendo mostrado imediatamente;
- validação de Saúde Geral foi retirada do caminho crítico do primeiro paint/toque;
- retorno de um painel agenda a revalidação em segundo plano em vez de executá-la imediatamente;
- ativos de Agendas, Moradores e Profissionais passam a ser preparados antecipadamente;
- preload estático continua em baixa prioridade;
- gravações continuam dependendo de confirmação remota real.

## Bloco isolado B — barra inferior
Arquivo: `central-administrativa-tacs.html`.

- dock passa a existir no HTML inicial do shell;
- estado sem sessão continua ocultando o dock antes do primeiro paint;
- hidratação posterior conecta as mesmas quatro ações já existentes;
- nenhum botão, texto, ícone ou regra de navegação foi redesenhado por esta correção.

## Validação interna
- JavaScript principal: sintaxe válida;
- script inline do shell: sintaxe válida;
- marcador `CORRECAO_CIRURGICA_DESEMPENHO_PAINEIS_20260913_V1`: presente;
- preload antigo de 3,5 s: ausente;
- dock real: uma única instância no HTML;
- dock antes do `<main>`: confirmado;
- proteção do dock na tela sem sessão: confirmada;
- referência do JS da Central: cache renovado.

## Commits
- `183093fac7404d65babe688a6e11c69b9870a4e0` — liberar painéis antes da sincronização remota;
- `13f3cbb92cce3a7072c2e5644f042294004f8383` — incluir barra inferior no shell inicial;
- `6acbb75d8634c87faeb9b4d2109e3760e3646504` — renovar cache da Central otimizada.

## Estado
**PUBLICADA PARA TESTE NO DISPOSITIVO.**

A correção não deve ser marcada como aprovada/concluída operacionalmente até o teste do usuário no iPhone confirmar a melhora perceptível e a navegação normal dos painéis.
