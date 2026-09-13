# Registro canônico — Tarefa 16 / Migração definitiva de Agendas e vagas

Data de validação: 12/09/2026

## Escopo autorizado

A Tarefa 16 executa o **primeiro bloco da migração definitiva painel a painel**, começando por **Agendas e vagas**, conforme o plano canônico.

Regra preservada do planejamento:
- começar por Agendas e vagas;
- não alterar ainda os outros painéis nesta etapa;
- os demais painéis permanecem no shell existente até suas próprias etapas de migração.

## Objetivo

Retirar **Agendas e vagas** da arquitetura em que o painel vivo era hospedado em iframe e fazer o módulo funcionar diretamente no shell da Central do Conecta Saúde Comunitária, preservando:
- sessão única;
- contexto da área;
- cache/frescor;
- deduplicação de leitura;
- timeout sem destruir sessão;
- edição;
- confirmação real de gravação;
- desfazer;
- isolamento territorial;
- navegação interna e retorno à Central.

## Contrato canônico

Fluxo normal:

`Central autenticada → tocar Agendas e vagas → host nativo da própria Central → snapshot/cache válido imediato → sincronização remota → edição → POST → releitura real → confirmação somente se os dados coincidirem → Voltar → mesma Central`

Regras consolidadas:

- `Agendas e vagas` é o primeiro painel definitivamente migrado para o host nativo;
- o caminho normal de Agendas não chama `ensureShellFrame()` nem usa `viewerFrame` para hospedar o painel;
- o `viewerFrame` permanece somente para painéis ainda não migrados;
- a página `painel-oficial-agendas-vagas.html` é preservada como fallback/histórico, não como arquitetura normal da Central;
- a superfície nativa é `#nativeModuleHost`;
- o módulo nativo usa `ConectaModuleCoreV1` para sessão, área, perfil, cache, requisições e política de falha;
- o módulo não possui login/PIN próprio;
- leitura usa `admin_dados` pelo broker do core;
- cache usa `performance.prime('agendas')` e `performance.commit('agendas')`;
- falha temporária mantém sessão e último dado válido;
- somente recusa explícita de autenticação é tratada como falha de sessão;
- gravação usa `admin_salvar_agenda`;
- uma gravação só é declarada concluída depois de **POST bem-sucedido + nova leitura real + comparação dos campos**;
- divergência após gravação mantém o estado como não confirmado;
- desfazer também exige gravação e releitura confirmada;
- cache público é invalidado após mutação confirmada;
- sincronização das vagas odontológicas continua disponível;
- proteção de alterações não salvas continua integrada ao Voltar;
- nenhuma alteração de backend Apps Script foi necessária.

## Arquivos de produção

Criados:
- `conecta-agendas-native-v1.js`
- `conecta-agendas-transport-v1.js`
- `conecta-agendas-native-v1.css`

Alterados:
- `central-administrativa-tacs.html`
- `central-administrativa-tacs.js`

Preservado como fallback histórico:
- `painel-oficial-agendas-vagas.html`

## Gate específico

`TAREFA_16_AGENDAS_NATIVAS_OK`

O gate comprova:
- marcador `TAREFA_16_AGENDAS_NATIVAS_V1`;
- host nativo presente na Central;
- desvio de Agendas para `showNativeAgenda()` antes da criação de frame;
- módulo nativo usa o core autenticado;
- ausência de login/PIN próprio;
- leitura, cache, deduplicação e política de timeout preservados;
- gravação exige releitura real;
- iframe existente no transporte é apenas ponte POST invisível e não hospeda/renderiza o painel;
- página antiga permanece preservada como fallback;
- demais painéis não foram migrados nesta tarefa.

## Compatibilidade com tarefas anteriores

Os testes históricos das Tarefas 10 e 15 e o gate de desempenho da Central esperavam o estado anterior sem `shellActiveNative`. Foram alinhados ao novo contrato sem remover nenhuma proteção anterior:

- `test_tarefa15_navegacao_interna.js`;
- `test_central_admin_performance_v1.js`;
- `test_tarefa10_sessao_shell_persistente.js`.

Falhas intermediárias:
- workflow `34730194156`: bloqueado pelo contrato histórico da Tarefa 15;
- workflow `34730225064`: bloqueado pelo contrato histórico de desempenho da Central.

Nenhuma dessas falhas invalidou dados ou alterou o backend.

## Validação final

Workflow final:
- run: `34730284225`
- resultado: `success`
- Tarefa 14: `TAREFA_14_TIMEOUT_SESSAO_OK`
- Tarefa 15: `TAREFA_15_NAVEGACAO_INTERNA_OK`
- Tarefa 16: `TAREFA_16_AGENDAS_NATIVAS_OK`
- quality gate: `QUALITY_GATE_V101_OK`
- homologação interna: `V101_INTERNO_APROVADO=SIM`

GitHub Pages:
- run: `34730279163`
- resultado: `success`

Backend:
- alterado: não
- Apps Script: permanece na versão `208`

## Commits principais da Tarefa 16

- `b47a865157aa3fae7267fef14531d9f341a15773` — início do módulo nativo;
- `4012c38647b13d245de1b612fb7a57ab6ab63a49` — visual nativo;
- `eb70374742c14c1f8df9298cc40622d0405668ce` — transporte do módulo nativo;
- `de2ffa8f16ce08d1c40b8cb29c50844b24929146` — implementação funcional;
- `6100a474b1b25ce47411a86f4a7c469855500e45` — host nativo na Central;
- `a3df010adf49c4170fb4572f21d17948b47638cd` — rota de Agendas para host nativo;
- `53e857af4676fbf538908080bd3328eece98bbf8` — indicador do shell;
- `b84c968a2ddcef52ddbe20c3c77f30df6d427b18` — gate específico;
- `e0e08ca66a362990604d7622f3bcf2b940689871` — inclusão na regressão;
- `3f76e2f4161a7d212523ecb890d6f5443d227398` — workflow observando arquivos da Tarefa 16;
- `4ac259a031f1a7a00d7fa1a70445e50db55c022d` — compatibilidade Tarefa 15;
- `8253ca64f15840387abb8621cd72917cd5a03a5a` — compatibilidade desempenho Central;
- `1fdae66f2780bc25b79d33fd0abcb4dc828aa7a2` — compatibilidade Tarefa 10.

## Estado final

**TAREFA 16 — PRIMEIRO PAINEL DEFINITIVO (AGENDAS E VAGAS) VALIDADO INTERNAMENTE, PUBLICADO E CANONIZADO.**

Os outros painéis permanecem inalterados nesta tarefa, conforme o próprio plano canônico.
