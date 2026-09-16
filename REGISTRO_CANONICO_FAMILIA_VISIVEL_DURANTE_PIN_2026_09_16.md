# Registro canônico — manter família visível durante criação do PIN

Data: 2026-09-16

## Sintoma
Após selecionar um integrante da família, o início da criação do PIN apagava a lista dos demais familiares da tela.

## Causa
`beginResidentPinEnrollment()` executava `hide()`, que ocultava e esvaziava `portalFamilyLookupV1`.

## Correção isolada
Bloco: `MANTER_LISTA_FAMILIAR_VISIVEL_DURANTE_PIN_2026_09_16_V1`

Arquivo funcional:
- `portal-identificacao-familia-v1.js`

Regra:
- iniciar o PIN não apaga nem oculta a lista familiar;
- os demais integrantes continuam disponíveis como seletor durante a mesma solicitação;
- o box de PIN é exibido separadamente.

## Fora do escopo
Não altera busca familiar, cache de moradores, backend, painéis administrativos, pré-carregamento, agendas, vagas, UBS, isolamento territorial ou velocidade dos painéis.
