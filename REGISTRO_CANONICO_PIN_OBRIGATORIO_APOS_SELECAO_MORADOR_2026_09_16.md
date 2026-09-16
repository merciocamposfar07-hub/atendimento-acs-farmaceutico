# Registro canônico — PIN obrigatório após seleção do Morador

Data: 2026-09-16

## Sintoma observado
No Portal público, ao localizar a família e selecionar um integrante identificado por CNS,
os dados eram preenchidos e o fluxo seguia diretamente para a escolha do serviço, sem
mostrar a criação do PIN.

## Causa
O frontend chamava `beginResidentPinEnrollment(...)` apenas quando o documento resolvido
era CPF. Quando o integrante vinha por CNS, a etapa de PIN era pulada.

Além disso, aparelhos multiperfil já reconhecidos como Administrador eram bloqueados pelo
backend mesmo quando o usuário entrava explicitamente pelo fluxo Morador.

## Correção isolada
Blocos:
- `PIN_OBRIGATORIO_APOS_SELECAO_MORADOR_2026_09_16_V1`
- `FLUXO_MORADOR_EXPLICITO_MULTIPERFIL_2026_09_16_V1`

Fluxo:
- integrante com CPF -> preparar criação do PIN;
- integrante apenas com CNS -> pedir CPF -> confirmar nascimento -> revisar/salvar CPF no
  mesmo cadastro -> criar e confirmar PIN;
- aparelho multiperfil/administrativo pode executar o fluxo Morador somente quando a própria
  porta residencial envia `fluxoMoradorExplicito=SIM`.

## Fora do escopo
Não altera painéis administrativos, pré-carregamento, agendas, vagas, profissionais,
serviços, UBS ou isolamento territorial.

## Arquivos funcionais
- `portal-identificacao-familia-v1.js`
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`
- `portal-auto-update.js` apenas para cache
- `.github/apps-script-release-request` apenas para acionar a implantação controlada
