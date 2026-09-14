# LABORATÓRIO — IA + AUTODIAGNÓSTICO + AUTORREPARO

Status: EXPERIMENTAL
Branch: laboratorio-ia-autorreparo
Base: main
Projeto oficial: NÃO ALTERAR

## Objetivo
Avaliar, em cópia isolada do Conecta Saúde Comunitária, uma camada de Supervisor Inteligente capaz de:

1. detectar lentidão, falhas e dados ausentes;
2. localizar módulo, arquivo, função, etapa e versão envolvidos;
3. identificar a causa quando tecnicamente observável;
4. executar reparos automáticos previamente autorizados;
5. testar o resultado do reparo;
6. aplicar rollback automático se houver regressão;
7. solicitar intervenção manual somente quando não houver reparo automático seguro;
8. registrar o incidente com diagnóstico técnico completo.

## Regra de isolamento
Nenhuma alteração deste laboratório pode ser aplicada à branch main sem decisão explícita posterior.

## Regra de segurança
A IA não recebe autorização irrestrita para editar o sistema. Qualquer ação automática deve ocorrer por funções permitidas, auditáveis e reversíveis.

## Dados sensíveis
Telemetria enviada ao Supervisor deve excluir CPF, CNS, PIN, tokens e dados pessoais/assistenciais sempre que esses campos não forem indispensáveis ao diagnóstico.

## Estado atual
Branch experimental criada. A integração de IA ainda não está ativa; ela será implementada exclusivamente nesta branch.
