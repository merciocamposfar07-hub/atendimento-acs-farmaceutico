# Registro canônico — Tarefa 07 — Núcleo único de Morador com diagnóstico administrativo

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 205

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


## Resultado técnico verificado
- tentativa inicial: workflow `34719766745` interrompido **antes do deploy** por uma asserção histórica da Tarefa 6;
- RETRY 1: workflow `34719839779` interrompido **antes do deploy** por outra asserção histórica que não admitia o novo `coreMode`;
- os dois gates históricos foram alinhados sem retirar nenhuma proteção da Tarefa 6;
- RETRY 2: workflow `34719916306` **success**;
- gate `TAREFA_7_MORADOR_CORE_DIAGNOSTICO_OK`: **aprovado**;
- suíte integral: **aprovada**;
- Apps Script: versão anterior `204`, nova versão **`205`**;
- health checks: **aprovados na primeira tentativa**;
- versões ativas após implantação: `6, 7, 9, 205`;
- GitHub Pages: **success**, run `34719909246`.

## Fechamento
A **Tarefa 7 está validada internamente, implantada e publicada**. Morador real e diagnóstico administrativo compartilham o mesmo núcleo/formulário, mas o modo administrativo continua sem assumir PIN, sessão, aparelho, quickKey ou notificações do Morador.
