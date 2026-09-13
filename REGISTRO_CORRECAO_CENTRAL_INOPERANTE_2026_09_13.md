# Correção emergencial da Central — 13/09/2026

Escopo autorizado: Central inoperante, seta voltar, painéis incompletos e dados que não reaparecem. Esta correção trata as regressões de visibilidade e o trabalho visual repetitivo comprovados em execução. Não declara concluída a lista de 18 tarefas nem comprova latência do Apps Script.

## Causas reproduzidas antes da correção

- Guarda visual deixava `display:block!important` inline no viewer depois de `closeViewer()` marcar `hidden`: o painel permanecia cobrindo a Central e recebendo os toques.
- CSS forçava a exibição de hosts nativos ocultos, mostrando módulos sobrepostos. Um host preservado não significa um host que deva ficar visível.
- Observer global reescrevia rodapés/estilos e observava as próprias alterações. Teste ocioso registrou 45 mutações em 250 ms.

## Correção e fluxo

Central autenticada → abrir somente host da rota ativa → voltar marca viewer oculto → Central recebe toques imediatamente → reabrir reutiliza o mesmo host e seus dados. Visibilidade pertence ao shell; CSS visual respeita `hidden`. A guarda só altera valores diferentes e desconecta o observer durante suas próprias escritas.

O mesmo bloco defeituoso estava copiado em 11 páginas; todas as cópias e o gerador canônico foram corrigidos. Ícone, textos, cores e funcionalidades permanecem os definidos. Nenhuma alteração de backend, permissões, autenticação, vínculos, regras de vagas ou exclusão de cache.

## Evidência

`scripts/test_central_visual_runtime_v1.js` executa CSS e JavaScript reais em DOM isolado: falhou antes e passou depois; verifica repouso sem mutações, ocultação imediata, troca de módulos e preservação do nó/dados. O gate textual que exigia a forma do observer defeituoso foi atualizado; o comportamento é coberto pelo novo teste executável.

Homologação autenticada com dados reais e validação física em iPhone/Android/computador da UBS não devem ser confundidas com esta regressão automatizada. Publicação e resultados finais serão registrados após confirmação.
