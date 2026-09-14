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

## Regra de atuação imediata e validação real
A partir do primeiro sinal objetivo de inconsistência, degradação, lentidão anormal, bloqueio, travamento, congelamento, falha de navegação, resposta incompleta ou erro funcional, o Supervisor deve entrar em ação automaticamente e em tempo real.

O fluxo obrigatório da fase crítica é:
detectar → isolar o fluxo afetado → localizar a causa → executar o menor reparo possível → repetir a operação real que falhou → medir o resultado → confirmar estabilidade → encerrar o incidente.

Regras obrigatórias:
- não esperar o usuário repetir a ação para iniciar o diagnóstico;
- não considerar um reparo concluído apenas porque o código foi alterado;
- não considerar um reparo concluído apenas porque não houve erro de sintaxe;
- a validação deve repetir a mesma operação funcional que apresentou a falha, no mesmo módulo e com o mesmo caminho de execução, sempre que isso puder ser feito com segurança;
- comparar o comportamento antes e depois do reparo, incluindo tempo de resposta, retorno de dados, renderização, navegação e estado final;
- verificar as dependências diretas do trecho alterado para detectar regressão imediata;
- somente marcar o incidente como `RESOLVIDO_VALIDADO` quando a operação real voltar a funcionar dentro dos critérios previstos;
- se o teste real falhar, o incidente permanece aberto, o reparo é revertido quando necessário e o Supervisor continua o diagnóstico;
- se a validação real não puder ser executada naquele momento por falta de rede ou dependência externa, o estado deve permanecer `AGUARDANDO_VALIDACAO_REAL` e a validação deve ser retomada automaticamente assim que a condição necessária voltar;
- intervenção manual continua sendo o último recurso.

## Regra de não proliferação de versões
O Supervisor deve atacar a causa no bloco canônico existente. É proibido criar uma nova versão de arquivo, módulo ou rotina apenas porque uma tentativa anterior falhou.

Regras obrigatórias:
- não criar sequências como `arquivo-v2.js`, `arquivo-v3.js`, `arquivo-v4.js` para corrigir o mesmo problema;
- não duplicar módulos para contornar uma falha que pertence ao módulo canônico;
- não manter versões antigas ativas em paralelo quando o problema já foi localizado no código oficial daquele bloco;
- corrigir diretamente o arquivo/função/bloco responsável pela causa;
- remover ou consolidar código obsoleto quando uma correção tornar uma versão paralela desnecessária, sempre sem afetar outras funções;
- preservar rastreabilidade por histórico Git/commit, e não por proliferação de arquivos e versões;
- só criar uma nova versão estrutural quando houver mudança de arquitetura real, aprovada e distinta da simples correção de defeito;
- a mesma inconsistência não pode gerar uma cadeia de novos arquivos como substituto para um diagnóstico causal.

Histórico e auditoria devem existir por commit. O número de arquivos e versões funcionais deve permanecer mínimo.

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

## Regra de declaração de estado normal restaurado
A mensagem de conclusão não pode ser genérica nem baseada apenas na existência de uma alteração de código.

O Supervisor só pode exibir `ESTADO_NORMAL_RESTAURADO` quando houver evidência objetiva de que a causa original foi resolvida e que a operação funcional afetada voltou a executar corretamente.

Antes dessa declaração, são obrigatórios:
- repetir a mesma operação real que apresentou a falha;
- confirmar que o erro original não reapareceu;
- confirmar que o fluxo completou até o estado final esperado;
- medir novamente tempo de resposta, retorno de dados, renderização, navegação e estado final conforme o tipo de incidente;
- verificar que o trecho corrigido está sendo efetivamente executado;
- verificar as dependências diretas afetadas pela correção;
- confirmar ausência de regressão imediata no fluxo diretamente relacionado;
- registrar evidências técnicas do teste, incluindo resultado, duração, módulo, arquivo, função, commit e incidente correspondente.

Mensagens como "reparo executado", "problema corrigido", "normalizado" ou "estado normal restaurado" são proibidas enquanto o teste funcional real não tiver sido concluído com sucesso.

Se o código tiver sido alterado mas o teste real ainda não tiver ocorrido, o estado deve ser `REPARO_APLICADO_AGUARDANDO_VALIDACAO`.

Se o teste real falhar, o Supervisor deve declarar `REPARO_NAO_VALIDADO`, manter o incidente aberto e continuar o diagnóstico ou executar rollback quando necessário.

Somente após aprovação do teste funcional real o incidente pode receber simultaneamente:
- `RESOLVIDO_VALIDADO`;
- `ESTADO_NORMAL_RESTAURADO`.

A declaração deve vir acompanhada do fundamento técnico da conclusão, nunca de texto vago de sistema.

## Regra de continuidade após reparo não validado
`REPARO_NAO_VALIDADO` é um estado transitório de trabalho e jamais um estado de encerramento.

Quando um teste falhar após uma tentativa de reparo, o Supervisor deve:
- manter o mesmo incidente ativo;
- permanecer restrito ao mesmo bloco causal e às dependências diretas comprovadamente relacionadas;
- comparar a falha anterior com o resultado da tentativa aplicada;
- usar essa diferença para refinar o diagnóstico;
- desfazer a tentativa se ela piorar o comportamento ou introduzir regressão;
- executar a próxima correção mínima no mesmo bloco responsável;
- repetir o teste funcional real;
- continuar o ciclo diagnóstico → reparo → teste → refinamento enquanto a causa persistir e houver ações automáticas seguras disponíveis;
- não criar nova versão paralela do módulo para cada tentativa;
- não deslocar a investigação para partes não relacionadas apenas porque uma tentativa falhou.

O ciclo só termina em uma destas condições:
1. `RESOLVIDO_VALIDADO` + `ESTADO_NORMAL_RESTAURADO`, após teste funcional real aprovado;
2. dependência externa indisponível, passando para estado de espera automática e retomada posterior;
3. inexistência de ação automática segura restante, quando então a intervenção manual pode ser solicitada como último recurso, acompanhada de todo o diagnóstico acumulado.

Enquanto nenhuma dessas condições ocorrer, o agente deve continuar trabalhando sobre a causa do mesmo incidente.

## Regra de isolamento
Nenhuma alteração deste laboratório pode ser aplicada à branch main sem decisão explícita posterior.

## Regra de segurança
A IA não recebe autorização irrestrita para editar o sistema. Qualquer ação automática deve ocorrer por funções permitidas, auditáveis e reversíveis.

## Dados sensíveis
Telemetria enviada ao Supervisor deve excluir CPF, CNS, PIN, tokens e dados pessoais/assistenciais sempre que esses campos não forem indispensáveis ao diagnóstico.

## Estado atual
Branch experimental criada. A integração de IA ainda não está ativa; ela será implementada exclusivamente nesta branch.
