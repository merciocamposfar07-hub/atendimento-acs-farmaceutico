# Registro canônico — restauração do fallback da consulta familiar

Data: 2026-09-16

## Sintoma
Ao informar o cadastro familiar, o Portal reconhecia o número, mas terminava em:
"A consulta demorou demais. Tente novamente."
Com isso, os moradores não eram listados e o fluxo não podia avançar para a identificação/PIN.

## Causa localizada
O fallback GET já homologado para a consulta familiar havia desaparecido do arquivo atual.
A função `consultarFamilia()` dependia apenas de `jsonpRetry(...)`.

## Correção isolada
Bloco: `RESTAURA_FALLBACK_GET_FAMILIA_2026_09_16_V1`

Arquivos alterados:
- `portal-identificacao-familia-v1.js`
- `portal-auto-update.js`
- `index.html` somente para renovação de cache/carregamento

Regra:
- a consulta `publico_familia_consultar` tenta o fluxo atual;
- se o JSONP falhar, usa GET/fetch como contingência;
- nenhum outro endpoint ganhou essa alteração;
- seleção dos integrantes, autofill, PIN, documentos e backend permanecem intactos.

## Fora do escopo
Não altera painéis administrativos, pré-carregamento, UBS, TACS, isolamento territorial, vagas, agendas, profissionais ou serviços.
