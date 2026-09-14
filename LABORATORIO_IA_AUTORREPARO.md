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
8. registrar o incidente com diagnóstico técnico completo;
9. manter uma fila persistente de falhas não resolvidas quando não houver internet;
10. retomar automaticamente o diagnóstico e o reparo assim que a conexão voltar.

## Fluxo obrigatório de recuperação
detectar → localizar → diagnosticar → tentar reparo local → testar → confirmar → continuar funcionando.

Se a correção depender de internet e a conexão não estiver disponível:

detectar → preservar último estado funcional → registrar incidente completo → enfileirar reparo pendente → continuar no modo possível/offline → detectar retorno da internet → retomar automaticamente o reparo → testar → confirmar → remover da fila.

## Regra de retomada automática após falta de internet
- A ausência de internet não encerra o incidente.
- O incidente deve permanecer com estado `PENDENTE_REDE`.
- O Conecta deve preservar módulo, arquivo, função, etapa, versão, commit, erro e todas as tentativas já realizadas.
- Ao detectar conexão novamente, o Supervisor deve retomar exatamente o mesmo incidente, sem exigir nova ação manual.
- Antes de alterar código ou estado crítico, deve revalidar se o erro ainda existe na versão atual.
- Se o problema já tiver desaparecido, deve encerrar como `RECUPERADO_SEM_ALTERACAO`.
- Se persistir, deve executar somente as ações automáticas autorizadas para aquele módulo.
- Se a reparação falhar, deve manter rollback/último estado funcional e registrar a próxima ação.
- Intervenção manual é o último recurso.

## Transparência obrigatória da correção
Sempre que houver reparo automático, o painel técnico deve informar:
- módulo;
- arquivo;
- função;
- linha/trecho afetado;
- causa identificada;
- ação executada;
- arquivos que não serão tocados;
- commit anterior;
- commit/revisão do reparo;
- teste executado;
- resultado da validação.

## Regra de localização obrigatória da causa
Se a causa ainda não estiver localizada com segurança, o Supervisor NÃO encerra o incidente e NÃO começa a alterar arquivos por tentativa.

O comportamento obrigatório é:

1. manter o incidente ativo em estado `DIAGNOSTICO_EM_ANDAMENTO`;
2. restringir a investigação ao fluxo real que apresentou a falha;
3. seguir somente as dependências efetivamente chamadas por esse fluxo;
4. medir cada etapa até identificar onde o comportamento divergiu;
5. reduzir progressivamente o escopo: módulo → arquivo → função → bloco → instrução/dependência;
6. excluir explicitamente do diagnóstico arquivos, módulos e regras sem relação causal demonstrada;
7. só alterar código quando houver evidência suficiente de relação com a falha;
8. aplicar a menor correção possível no menor trecho possível;
9. testar especificamente o problema original e as dependências diretas afetadas;
10. manter o último estado funcional ou rollback se a correção não resolver.

É proibido usar alterações exploratórias em partes não relacionadas do sistema apenas para verificar se o problema desaparece.

Se a origem estiver numa dependência externa ou em uma camada que o Conecta não possa modificar, o Supervisor deve continuar tentando contornar a causa dentro do próprio fluxo afetado, usando recuperação segura, fallback, nova tentativa controlada, isolamento do módulo ou último estado válido. Intervenção manual permanece como último recurso quando não existir reparo automático tecnicamente seguro.

## Regra de isolamento
Nenhuma alteração deste laboratório pode ser aplicada à branch main sem decisão explícita posterior.

## Regra de segurança
A IA não recebe autorização irrestrita para editar o sistema. Qualquer ação automática deve ocorrer por funções permitidas, auditáveis e reversíveis.

## Dados sensíveis
Telemetria enviada ao Supervisor deve excluir CPF, CNS, PIN, tokens e dados pessoais/assistenciais sempre que esses campos não forem indispensáveis ao diagnóstico.

## Estado atual
Branch experimental criada. A integração de IA ainda não está ativa; ela será implementada exclusivamente nesta branch.
