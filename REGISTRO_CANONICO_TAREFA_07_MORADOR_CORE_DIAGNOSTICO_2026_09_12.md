# Registro canônico — Tarefa 07 — Núcleo único de Morador com diagnóstico administrativo

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

## Objetivo exclusivo da Tarefa 7
Separar semanticamente o acesso real do Morador do teste administrativo sem manter dois formulários paralelos.

O núcleo do fluxo passa a operar em dois modos explícitos:
- `MORADOR_REAL`;
- `DIAGNOSTICO_ADMINISTRATIVO`.

## Regras
- os dois modos usam o mesmo `residentStage` e o mesmo formulário inicial de identificação;
- no modo real, o fluxo continua seguindo CPF → confirmação complementar quando necessária → PIN → sessão;
- no modo diagnóstico, o mesmo núcleo aceita CPF ou CNS e apresenta o resultado no mesmo ambiente;
- o diagnóstico não cria PIN, sessão, quickKey, aparelho residencial ou notificação;
- o servidor devolve e confirma `coreMode: DIAGNOSTICO_ADMINISTRATIVO`;
- a barreira de segurança da Tarefa 6 permanece obrigatória;
- nenhuma migração de painel/módulo da Tarefa 8 é iniciada aqui.

## Implementação
- `conecta-acesso-unificado-v1.js`: adicionados os modos `MORADOR_REAL` e `DIAGNOSTICO_ADMINISTRATIVO`, um único formulário `cscResidentDocument` e um único dispatcher `startResidentDocument()`;
- o resultado administrativo usa o mesmo `residentStage`, mas encerra em consulta, sem avançar para criação de PIN;
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`: resposta do diagnóstico passa a expor `coreMode:'DIAGNOSTICO_ADMINISTRATIVO'`.

## Gate obrigatório
`scripts/test_tarefa7_morador_core_diagnostico.js`

Saída esperada:
`TAREFA_7_MORADOR_CORE_DIAGNOSTICO_OK`

A Tarefa 7 só pode ser concluída após gate específico, suíte integral, Apps Script/health check e GitHub Pages passarem.
