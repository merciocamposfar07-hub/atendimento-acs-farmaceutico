# Registro canônico — Tarefa 18 / Migração definitiva de Profissionais e serviços

Data de validação: 12/09/2026

## Escopo autorizado

A Tarefa 18 é a última tarefa da sequência original aprovada de 1 a 18.

Nesta tarefa:
- **Profissionais e serviços** é migrado para superfície nativa da Central;
- Agendas e vagas permanece nativa;
- Moradores permanece nativo;
- Prontuários continua fora deste escopo, no frame legado já definido anteriormente;
- nenhum painel adicional ou Tarefa 19 é iniciado;
- backend Apps Script não é alterado.

## Objetivo

Retirar Profissionais e serviços da arquitetura visual baseada em página/iframe e fazer a interface viva funcionar diretamente no shell da Central do Conecta Saúde Comunitária, preservando:

- sessão única do Conecta;
- área territorial;
- leitura real;
- profissionais;
- serviços;
- criação integrada de profissional + primeiro serviço + agenda;
- cache e stale-while-revalidate;
- deduplicação de leitura;
- gravação real;
- releitura e comparação antes de confirmar sucesso;
- desfazer;
- proteção de alterações não salvas;
- isolamento das superfícies nativas anteriores.

## Contrato canônico

Fluxo:

`Central autenticada → Profissionais e serviços → host nativo próprio → ponte invisível de lógica validada → leitura/cache → edição/criação → gravação real → releitura → confirmação → Voltar → mesma Central`

Regras:

- a rota normal `profissionais` usa `showNativeProfissionais()`;
- o host vivo é `#nativeProfissionaisHost`;
- a UI nativa não possui PIN, login ou logout próprios;
- a página `teste-v1/painel-profissionais-servicos-v1.html` permanece preservada como fallback e ponte invisível;
- o iframe da ponte permanece oculto e nunca hospeda a interface visível;
- sessão e área continuam sob `ConectaModuleCoreV1`;
- ações reais permanecem:
  - `admin_salvar_profissional`;
  - `admin_salvar_servico`;
  - `admin_criar_profissional`;
- salvar profissional só é confirmado após nova leitura e `bridgeProfEqual()`;
- salvar serviço só é confirmado após nova leitura e `bridgeServEqual()`;
- criação integrada só é confirmada após releitura e presença efetiva do profissional;
- criação integrada preserva o comportamento já existente de profissional + primeiro serviço + cinco dias úteis de agenda;
- serviço redundante “ATENDIMENTO ODONTOLOGICO DE EMERGENCIA” continua omitido da superfície nativa;
- desfazer continua disponível;
- edição pendente marca `data-tacs-dirty` e continua protegida pelo Voltar;
- Agendas, Moradores e Profissionais possuem superfícies nativas independentes;
- ao trocar entre superfícies, somente a ativa fica visível, sem destruir o estado das demais;
- nenhum `TAREFA_19` é introduzido.

## Arquivos de produção

Criados:
- `conecta-profissionais-native-v1.js`
- `conecta-profissionais-native-v1.css`

Alterados:
- `teste-v1/painel-profissionais-servicos-v1.html`
- `central-administrativa-tacs.js`

Preservados:
- `painel-oficial-profissionais-servicos.html`
- `teste-v1/painel-profissionais-servicos-v1.html` como fallback/ponte invisível.

## Gate específico

`TAREFA_18_PROFISSIONAIS_NATIVOS_OK`

O gate comprova:

- marcador `TAREFA_18_PROFISSIONAIS_NATIVOS_V1`;
- rota `profissionais` entra no host nativo antes de `ensureShellFrame()`;
- host `nativeProfissionaisHost`;
- ausência de PIN/login/logout na UI nativa;
- ponte iframe oculta;
- API `ConectaProfissionaisBridgeV1`;
- releitura real após salvar profissional;
- releitura real após salvar serviço;
- releitura real após criação integrada;
- comparação de profissional e serviço antes de declarar sucesso;
- core/cache/deduplicação preservados;
- proteção de alterações não salvas;
- coexistência com Agendas e Moradores nativos;
- ausência de Tarefa 19.

## Compatibilidade com tarefas anteriores

O gate histórico da Tarefa 17 ainda proibia literalmente `TAREFA_18` na Central. Ele foi alinhado para:

- permitir a sequência autorizada;
- continuar proibindo que os arquivos próprios de Moradores absorvam lógica de Profissionais.

Nenhuma proteção funcional da Tarefa 17 foi removida.

## Validação final

Workflow:
- run: `34731693675`
- resultado: `success`

Comprovações no log:
- `TAREFA_14_TIMEOUT_SESSAO_OK`;
- `TAREFA_15_NAVEGACAO_INTERNA_OK`;
- `TAREFA_16_AGENDAS_NATIVAS_OK`;
- `TAREFA_17_MORADORES_NATIVOS_OK`;
- `TAREFA_18_PROFISSIONAIS_NATIVOS_OK`;
- `QUALITY_GATE_V101_OK`;
- `V101_INTERNO_APROVADO=SIM`.

GitHub Pages do HEAD validado:
- run: `34731696614`
- resultado: `success`

Backend:
- alterado: não
- Apps Script: permanece na versão `208`

## Commits principais

- `4eac77a779fcbb0dcd53cd6312588b2a233e76ef` — visual nativo;
- `c3762db0b63119a59140a0eda52e561e08ba5c05` — ponte interna de profissionais;
- `7d2ab132838f9274bfcfff45883bbd3a70854427` — módulo nativo;
- `190be889774809e6d4b50b18084ccf9f84a9cc1c` — roteamento da Central;
- `c9a450bf702351b2a385cabdeba74b9fa85337c5` — isolamento das superfícies nativas;
- `c5774e0b805696da93eaa26b4de62482ef970004` — compatibilidade da Tarefa 17;
- `2f1968849d8a772b97a877945162f8a39af7ab69` — gate específico;
- `cb44e20f62f7e630c535c5ea2cde68e05a63bce0` — inclusão na regressão;
- `e26d0f22b30717bca2691d4f936dab24dfe5804d` — workflow observando arquivos da Tarefa 18.

## Estado final

**TAREFA 18 — PROFISSIONAIS E SERVIÇOS NATIVOS VALIDADA INTERNAMENTE, PUBLICADA E CANONIZADA.**

**A sequência original aprovada de Tarefas 1 a 18 fica encerrada. Não existe Tarefa 19 nessa sequência.**
