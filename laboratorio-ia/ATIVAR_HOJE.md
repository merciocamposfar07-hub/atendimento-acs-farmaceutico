# Piloto local sem API — 14/09/2026

Esta instrução substitui a ativação remota anteriormente descrita neste arquivo.

- Branch: `laboratorio-ia-autorreparo`.
- Bloco: `supervisor-client.js`, versão `lab-local-2026-09-14-r1`.
- Não configurar chave, saldo nem Apps Script para este piloto.
- Chamadas remotas bloqueadas no cliente, inclusive com `supervisorApi` ou endpoint salvo. Limite de gasto do cliente: zero.
- O backend remoto existente não foi ativado ou alterado neste passo.
- Não basta inverter a flag para liberar a etapa remota: ainda faltam orçamento central, deduplicação no servidor, limites de tentativas e validação do fluxo de reparo.

## Funcionamento disponível

Monitores já existentes de erros, navegação, rede, interação e carregamento; registro local; repetições acumuladas no mesmo incidente; botão “Supervisor local” para reabrir o painel; fila sem internet; memória de validações informadas.

Sintomas distintos só podem compartilhar incidente quando a instrumentação fornece `operacaoId` explícito da mesma operação e módulo. Os monitores genéricos ainda não propagam esse ID automaticamente. Associação não confirma causalidade.

`ConectaSupervisorIA.registrarValidacao(id, evidencia)` exige aprovação explícita, descrição do teste, causa, correção, versão e commit completo. Registra evidência declarada; não executa nem certifica testes. Recorrência consulta memória e permanece aberta para investigação, sem reaplicar código.

## Limites reais

- Sem modelo: não há investigação de causas novas, pesquisa web, geração ou aplicação autônoma de reparos.
- Eventos de recuperação não têm consumidores confirmados no código; não comprovam recuperação.
- Fila limitada aos 40 incidentes mais recentes, 8 evidências recentes por repetição; não substitui histórico central auditável.
- Persistência é por origem/navegador. Sem armazenamento disponível, usa memória da página e informa a limitação. Não é agregação global entre aparelhos.
- Os monitores são heurísticos e podem gerar falsos positivos. O carregamento do script ao fim do HTML não captura todos os erros anteriores à inicialização.
- Nenhuma alteração foi feita em login, permissões, vagas, cadastros ou backend oficial.

## Verificação executável

`node --test laboratorio-ia/test-local.cjs`

Testes sintéticos isolados do Supervisor, sem dados reais e sem chamadas de rede. Não equivalem a aprovação funcional do Conecta no iPhone.

## URL

A branch é código. Ainda não há uma URL navegável própria confirmada para este laboratório. A publicação deve manter origem separada e verificar isolamento de backend, escrita, cache e service worker antes de permitir uso com dados reais.
