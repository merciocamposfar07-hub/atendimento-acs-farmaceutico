# Portal CSC Morador — abertura e informações públicas imediatas (22/11/2026)

## Diagnóstico
- O Portal exibiu a animação visual de 2,8 segundos também no retorno do PIN, inclusive em uma rota de PIN local que entra sem token remoto imediato.
- O módulo "Solicitar serviço para outra pessoa" dependia originalmente de verificações de 900 ms e depois de 100 ms; a chegada da sessão já possui evento nativo.
- Os recados e campanhas usam o serviço público `painel_publico`. O cache anterior era descartado após 15 minutos; quando a API demorava, os cartões desapareciam até a nova resposta. O render também recriava os cartões mesmo sem mudanças.

## Alteração delimitada
- Preservar a apresentação inicial ao abrir pelo ícone, **sem repetir o splash após PIN** (normal e local); o parâmetro de retorno autenticado evita regressão em recarga de service worker.
- Eliminar o polling de exibição da nova função: utilizar token já disponível, `tacs:morador`, `pageshow` e foco.
- Iniciar leitura de `painel_publico` já na abertura, sem PIN/CPF; consumir o resultado na mesma tela sem requisições duplicadas.
- Renderizar recados e campanhas imediatamente com último snapshot público confirmado **do mesmo dia na zona America/Recife**, respeitando invalidação de publicação e isolamento por área; atualizar em segundo plano.
- Inicializar os cartões antes dos scripts mais pesados do portal e não recriar DOM se o conteúdo não mudou.
- Preservar identidade, permissões, validações, formulário, agendas, envio único, notificações privadas e backend.

## Limite técnico
O primeiro acesso sem cache depende de uma resposta pública do servidor; nenhuma interface pode apresentar conteúdo novo que nunca recebeu. O aplicativo antecipa essa consulta para a abertura e não deixa cartões válidos desaparecerem apenas porque o cache chegou a 15 minutos. Informação pública de outro dia/território não é reutilizada.
