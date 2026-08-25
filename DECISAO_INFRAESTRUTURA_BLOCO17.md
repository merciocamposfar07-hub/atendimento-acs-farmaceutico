# Bloco 17 — decisão de infraestrutura baseada em medição

Data: 2026-08-24

## Decisão

Manter, neste ciclo, a arquitetura atual do Portal TACS:

- frontend estático no GitHub Pages;
- Google Apps Script + Google Sheets para dados e escritas do projeto;
- OneSignal com worker dedicado em `/push/` para Push;
- navegação administrativa com painéis persistentes no navegador;
- snapshots/local-first para leitura imediata onde já foi homologado como seguro;
- sincronização e escritas críticas sempre confirmadas pelo servidor.

**Não migrar agora para servidor próprio, VPS, banco pago ou backend novo.**

## Evidência que sustenta a decisão

A meta principal deste ciclo é eliminar espera ao abrir, trocar e reabrir painéis já acessados. Essa parte é dominada pela camada de interface, e não pelo local em que o Apps Script roda.

Os gates atuais exigem:

- primeiro toque da Central abaixo de 100 ms;
- retorno à Central abaixo de 150 ms;
- painel preservado reabrindo abaixo de 300 ms;
- snapshot local de Agendas aparecendo em até 300 ms após o shell;
- painel persistente sem novo `load` ao voltar e reabrir;
- regressão em Chromium, Firefox e WebKit/Safari.

O Bloco 13 comprovou reabertura do mesmo iframe sem reload e estado interno preservado. Os hotfixes posteriores mantiveram os iframes vivos, roláveis e fora da superfície de toque quando inativos. A regressão mais recente cobre também interface, Push, família, território e navegação.

A camada pública já mantém cache local, deduplica consulta simultânea e atualiza silenciosamente em segundo plano. Portanto, mover o frontend para outro servidor não elimina a espera que já foi eliminada pela persistência/local-first.

## Por que não migrar agora

Uma migração neste momento adicionaria risco sem benefício comprovado para a meta de navegação instantânea:

- nova autenticação/sessão;
- migração de dados;
- novas regras de CORS e segurança;
- risco de quebrar isolamento territorial;
- risco de regressão em CPF/CNS, família, Push e vagas;
- custo e manutenção adicionais;
- necessidade de nova homologação completa.

O Apps Script continua adequado enquanto a interface mostra dados locais imediatamente e usa o servidor para atualização e confirmação de escrita.

## O que deve continuar sendo medido

A decisão deve ser reaberta somente se surgir evidência objetiva de gargalo no backend. Exemplos de gatilho:

1. leitura fresca remota repetidamente lenta mesmo com o shell já aberto;
2. escritas críticas demorando a confirmar a ponto de prejudicar o uso real;
3. limites/quota do Apps Script afetando disponibilidade;
4. crescimento de volume que torne Sheets/Apps Script insuficientes;
5. necessidade funcional que exija banco transacional ou comunicação em tempo real.

Esses gatilhos são critérios de revisão, não afirmações de problema atual.

## Regra de preservação

Nenhuma migração de infraestrutura poderá ser feita apenas para “parecer mais robusto”. Ela só será autorizada quando a medição mostrar benefício real superior ao risco de alterar funções já estabilizadas.

Até lá, a prioridade é manter a arquitetura simples, sem custo adicional e com comportamento app-like no navegador/PWA.
