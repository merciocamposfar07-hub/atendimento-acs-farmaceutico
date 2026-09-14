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

## Regra de velocidade e continuidade operacional
O Supervisor não pode bloquear o agente de saúde ou o administrador por longos períodos enquanto diagnostica ou repara uma falha.

Princípio obrigatório:
falha detectada → resposta imediata ao usuário → recuperação local rápida → continuidade operacional segura → diagnóstico/reparo aprofundado sem bloquear a interface.

Orçamento operacional:
- até 1 segundo: detectar a anomalia e registrar o incidente;
- até 3 segundos: tentar recuperação local imediata no próprio módulo;
- até 8 segundos: concluir uma segunda estratégia segura de recuperação ou ativar fallback/último estado válido;
- acima de 8 segundos: a interface não pode permanecer congelada aguardando o Supervisor. O módulo deve entrar em modo degradado seguro, usar snapshot válido quando permitido, isolar somente a função afetada e permitir que o restante do aplicativo continue operando;
- o diagnóstico aprofundado e novas tentativas automáticas podem continuar em segundo plano, mas sem bloquear a navegação principal.

É proibido deixar o usuário aguardando 10, 15 ou 20 minutos por uma correção automática com tela travada, carregamento infinito ou painel inutilizável.

Enquanto o reparo ainda estiver em andamento, o painel técnico deve informar objetivamente:
- incidente ativo;
- módulo afetado;
- ação atual;
- estado operacional disponível;
- se está usando fallback, snapshot ou modo degradado;
- se o usuário pode continuar trabalhando naquele painel ou apenas nos demais módulos.

Se a falha atingir somente um módulo, os demais módulos devem permanecer funcionais.

Se houver risco de inconsistência em operação crítica de escrita, o Conecta deve bloquear somente aquela ação crítica específica, nunca o aplicativo inteiro, até que a validação necessária seja concluída.

O Supervisor deve priorizar reparos por impacto operacional:
1. desbloquear a interface;
2. restaurar leitura dos dados;
3. restaurar navegação;
4. restaurar ações críticas de escrita;
5. otimizar desempenho residual.

Tempo de reparo não validado não autoriza encerrar o incidente, mas também não autoriza prender o usuário à espera. O agente continua trabalhando no mesmo incidente enquanto o aplicativo preserva o máximo de operação segura possível.

## Regra de aprendizado operacional e prevenção de recorrência
O Supervisor deve aprender com cada incidente real resolvido para reduzir a chance de repetição da mesma falha.

Esse aprendizado NÃO significa permitir que o modelo altere livremente sua própria lógica ou reescreva o aplicativo sem controle. O aprendizado deve ser persistido de forma estruturada, auditável e vinculada ao código canônico.

Para cada incidente que alcance `RESOLVIDO_VALIDADO`, o Conecta deve registrar uma memória técnica com:
- identificador do incidente;
- módulo, arquivo, função e bloco causal;
- assinatura/fingerprint da falha;
- causa-raiz confirmada;
- sintomas observados;
- condições que dispararam o problema;
- correção canônica aplicada;
- commit da correção;
- teste funcional real que validou o reparo;
- métricas antes/depois;
- dependências diretas afetadas;
- regra preventiva criada;
- teste de regressão permanente associado;
- data/hora e versão do aplicativo.

A partir dessa memória, o Supervisor deve:
1. reconhecer rapidamente a mesma assinatura se a falha tentar reaparecer;
2. executar primeiro a correção ou contenção já validada, quando ainda aplicável à versão atual;
3. adicionar guardas no bloco causal para impedir estados já conhecidos como inválidos;
4. manter teste de regressão para a falha resolvida;
5. comparar mudanças futuras naquele bloco com o histórico de incidentes;
6. impedir que uma nova alteração reintroduza comportamento já classificado como defeituoso;
7. alertar quando uma modificação planejada toca um bloco com histórico crítico;
8. adaptar limites de tempo, fallback e observabilidade com base no uso real em campo;
9. priorizar problemas que prejudiquem diretamente o trabalho de TACS, administradores e UBS;
10. manter o conhecimento vinculado ao bloco canônico, sem criar versões paralelas.

## Regra de prevenção antes da falha
O objetivo não é apenas reparar depois que o problema aparece. O Supervisor deve usar o histórico validado para prevenir recorrências.

Antes de aplicar qualquer mudança automática em um bloco com histórico de incidentes, deve executar os testes de regressão associados àquele bloco e verificar as regras preventivas já registradas.

Quando detectar condições conhecidas que antecedem uma falha, deve agir antes do travamento completo, por exemplo:
- cancelar requisição que entrou no padrão de timeout já conhecido;
- impedir duplicidade de chamada já associada a congelamento;
- renovar sessão antes de expirar quando houver evidência segura;
- reconstruir somente o componente que entrou em estado inconsistente conhecido;
- trocar para snapshot/fallback quando a telemetria indicar degradação já catalogada;
- bloquear a introdução de código que viole uma regra preventiva estabelecida após incidente anterior.

## Regra de não recorrência de falha já certificada
Para a mesma falha, mesma causa-raiz, mesmo bloco causal e mesmo fluxo funcional já corrigidos, aprendidos, testados e certificados no código canônico, a recorrência é proibida.

Depois que um incidente atingir simultaneamente:
- `RESOLVIDO_VALIDADO`;
- `ESTADO_NORMAL_RESTAURADO`;
- teste funcional real aprovado;
- teste de regressão permanente aprovado;
- regra preventiva incorporada ao bloco canônico;

o Supervisor deve considerar aquela causa como condição que não pode voltar a produzir o mesmo defeito naquele fluxo.

Se a mesma causa voltar a gerar a mesma falha, o sistema deve classificar o evento como `REGRESSAO_CRITICA_DE_FALHA_CERTIFICADA`, porque isso significa que pelo menos uma destas garantias falhou:
- a correção não foi consolidada corretamente;
- a regra preventiva deixou de ser aplicada;
- uma alteração posterior reintroduziu a causa;
- o teste de regressão não cobriu corretamente o comportamento real;
- o bloco canônico foi substituído, duplicado ou desviado por outra versão;
- a certificação anterior foi emitida sem evidência suficiente.

Nessa situação, o Supervisor deve:
1. restaurar imediatamente o último estado realmente certificado;
2. impedir que a mesma mudança defeituosa permaneça ativa;
3. localizar qual alteração reintroduziu a causa;
4. corrigir o mesmo bloco causal;
5. repetir todos os testes funcionais e de regressão associados;
6. atualizar a memória técnica para impedir nova reincidência;
7. não emitir nova certificação até provar novamente o comportamento real.

Mudanças externas ou uma causa nova podem gerar um incidente diferente, mas isso não pode ser usado para justificar o retorno de uma falha já conhecida e certificada pela mesma causa.


## Regra de backup, substituição canônica e retenção somente do que funciona
Antes de qualquer correção automática em código, o Supervisor deve preservar um ponto de restauração confiável do estado imediatamente anterior.

Esse backup deve ser lógico e rastreável por Git/commit, snapshot ou mecanismo equivalente de rollback. Ele não deve gerar cópias paralelas permanentes do mesmo arquivo dentro do código operacional.

Fluxo obrigatório:
1. identificar a causa no bloco canônico;
2. registrar o estado anterior e criar ponto de restauração;
3. aplicar a correção diretamente no arquivo/função/bloco responsável;
4. executar teste funcional real;
5. se falhar, reverter para o último estado funcional e descartar a tentativa defeituosa;
6. se funcionar, manter a correção no mesmo bloco canônico;
7. executar testes de regressão;
8. consolidar somente a correção validada como conhecimento permanente do sistema.

É proibido:
- criar arquivos como `backup-v1.js`, `backup-v2.js`, `corrigido-v3.js` para cada tentativa;
- manter código morto, experimental ou substituído carregado pelo aplicativo;
- deixar correções fracassadas comentadas dentro do arquivo canônico;
- manter múltiplas implementações concorrentes do mesmo fluxo sem necessidade arquitetural real;
- transformar o histórico de tentativas em inflação do código de produção.

O histórico técnico das tentativas deve permanecer fora do caminho operacional, em commits, incidentes e registros de auditoria.

O que deve permanecer no código aprendido é apenas:
- correção efetivamente funcional;
- regra preventiva validada;
- teste de regressão correspondente;
- observabilidade necessária para detectar nova anomalia;
- dependências estritamente necessárias ao funcionamento correto.

Qualquer código que não tenha função operacional validada, que tenha sido substituído ou que provoque desalinhamento negativo deve ser removido do caminho ativo após confirmação segura da substituição.

Backup serve para rollback e auditoria. Não serve para multiplicar versões do aplicativo.

## Regra de não degradação pelo próprio Supervisor
O Supervisor IA não pode reduzir a velocidade, responsividade ou fluidez do Conecta Saúde Comunitária.

O monitoramento deve ser projetado para consumir o mínimo possível do caminho crítico da interface.

Regras obrigatórias:
- nenhuma análise pesada de IA pode executar de forma síncrona no thread principal da interface;
- chamadas remotas do Supervisor devem ser agendadas fora do caminho crítico, preferencialmente em tempo ocioso do navegador;
- a recuperação local leve pode ocorrer imediatamente, mas deve ser curta e determinística;
- observação do DOM deve ser incremental e limitada, sem varreduras contínuas de toda a página;
- monitores de carregamento devem acompanhar somente candidatos relevantes já identificados;
- eventos de interação devem usar listeners passivos quando possível;
- o Supervisor deve reduzir automaticamente sua frequência de observação se detectar que seu próprio custo está aumentando;
- o restante do aplicativo sempre tem prioridade sobre telemetria, diagnóstico remoto e aprendizado;
- o Supervisor não pode gerar chamadas de rede repetitivas sem incidente real;
- nenhuma função operacional do Conecta pode depender de uma resposta da IA para continuar funcionando quando houver fallback local seguro.

Orçamento interno inicial do laboratório:
- trabalho síncrono do Supervisor por evento: alvo máximo de 4 ms;
- janela de 5 segundos: se o custo acumulado do Supervisor superar 20 ms, entrar em modo leve;
- modo leve reduz quantidade de elementos inspecionados e frequência de observação;
- análise remota continua assíncrona e não bloqueante.

Se a telemetria demonstrar que o Supervisor está causando degradação perceptível, isso deve ser tratado como defeito do próprio Supervisor e corrigido antes de qualquer expansão de funções.

## Regra de despertar junto com o aplicativo
O Supervisor IA deve ser inicializado junto com a abertura do Conecta Saúde Comunitária e permanecer ativo durante toda a sessão.

Ele não pode esperar uma falha explícita para começar a observar o sistema.

Desde o primeiro carregamento, deve acompanhar em tempo real:
- tempo até a interface ficar interativa;
- tempo total de carregamento;
- disponibilidade de rede;
- abertura e estabilização da tela inicial;
- resposta de sessão e autenticação;
- carregamento dos dados iniciais;
- renderização da interface;
- comandos do usuário;
- abertura de painéis;
- transições entre módulos;
- requisições de rede;
- indicadores de carregamento;
- bloqueios ou congelamentos;
- estado final de cada operação importante.

Se houver degradação anormal durante a própria abertura, o Supervisor deve tratá-la como incidente operacional e iniciar recuperação sem esperar o usuário repetir o comando.

O objetivo é que a interação percebida pelo usuário seja rápida, contínua e previsível. O Supervisor deve atuar para reduzir espera desnecessária, evitar telas vazias/congeladas e preservar continuidade de uso.

As metas de desempenho devem ser avaliadas com telemetria real do Conecta e aprimoradas continuamente, sem mascarar atraso com mensagens genéricas de carregamento.

## Escopo global de supervisão ponta a ponta
O Supervisor IA do laboratório deve acompanhar a execução completa do Conecta Saúde Comunitária, e não somente a Central Administrativa.

Cobertura obrigatória:
- entrada e autenticação;
- Central Administrativa;
- painel de UBS;
- agendas e vagas;
- profissionais e serviços;
- recados e campanhas;
- TACS e áreas;
- municípios e organizações;
- suporte e busca de moradores;
- portal público/morador;
- navegação entre telas;
- carregamento e renderização;
- requisições de rede;
- sessão e cache;
- cliques e comandos que não produzam resposta;
- indicadores de carregamento persistentes;
- falhas JavaScript e Promises;
- bloqueios prolongados da interface;
- perda e retorno de internet.

O Supervisor deve acompanhar a experiência real do humano final e priorizar:
1. fluidez de navegação;
2. resposta rápida aos comandos;
3. continuidade operacional;
4. dados coerentes e completos;
5. recuperação automática de falhas;
6. redução de esperas desnecessárias;
7. prevenção de recorrência de problemas já certificados.

A atuação automática pode otimizar, reparar, sanar e ajustar problemas técnicos de execução e experiência operacional quando houver relação causal demonstrada.

O Supervisor NÃO pode, por iniciativa própria, redefinir regras de negócio, permissões, distribuição de vagas, vínculos territoriais, conteúdo clínico, cadastros ou decisões administrativas. Alterações desse tipo não são autorreparo técnico e permanecem fora do escopo automático.

## Regra de isolamento
Nenhuma alteração deste laboratório pode ser aplicada à branch main sem decisão explícita posterior.

## Regra de segurança
A IA não recebe autorização irrestrita para editar o sistema. Qualquer ação automática deve ocorrer por funções permitidas, auditáveis e reversíveis.

## Dados sensíveis
Telemetria enviada ao Supervisor deve excluir CPF, CNS, PIN, tokens e dados pessoais/assistenciais sempre que esses campos não forem indispensáveis ao diagnóstico.

## Estado atual
Branch experimental criada. A integração de IA ainda não está ativa; ela será implementada exclusivamente nesta branch.
