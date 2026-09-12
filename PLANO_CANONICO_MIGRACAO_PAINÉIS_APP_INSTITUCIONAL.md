# Plano canônico — migração dos painéis para o App institucional

Data: 10/09/2026
Base visual: `4 • App institucional`
Objetivo: tornar cada painel vivo e funcional sem repetir os atrasos, recarregamentos e erros de inicialização dos painéis administrativos atuais.

## Princípio central
A Central deve funcionar como **um aplicativo persistente**, não como uma coleção de páginas que reiniciam a cada toque.

## Arquitetura de desempenho obrigatória
1. **App shell persistente**: cabeçalho, navegação, sessão e contexto da área permanecem carregados.
2. **Roteamento interno**: abrir painéis dentro da mesma aplicação, sem recarregar a página inteira.
3. **Pré-carregamento inteligente**: após a Central estabilizar, preparar em segundo plano os módulos mais prováveis.
4. **Cache local de leitura**: exibir imediatamente o último estado válido e atualizar silenciosamente em segundo plano.
5. **Stale-while-revalidate**: dado conhecido aparece primeiro; atualização real ocorre sem bloquear a interface.
6. **Deduplicação de requisições**: um toque não pode disparar várias chamadas iguais ao backend.
7. **Cancelamento de chamadas antigas**: respostas atrasadas não podem sobrescrever estado mais novo.
8. **Estado único por área/sessão**: Japaranduba, Matias ou outra área nunca podem compartilhar cache ou resultado indevido.
9. **Escrita com confirmação real**: a tela pode responder imediatamente ao toque, mas só deve marcar uma alteração como salva depois da confirmação do backend.
10. **Retentativa controlada e timeout real**: falhas devem ser tratadas sem travar o painel e sem criar duplicidade de gravação.
11. **Sem iframes como arquitetura definitiva dos módulos**: iframe pode permanecer apenas em homologação temporária; os painéis vivos devem compartilhar o mesmo shell e a mesma camada de dados.
12. **Instrumentação de desempenho**: medir tempo de primeiro toque, abertura, primeira informação útil, atualização e gravação de cada painel.

## Meta prática de experiência
- toque: resposta visual imediata;
- painel já visitado: reabertura praticamente instantânea pela memória/cache local;
- painel não visitado: shell aparece imediatamente e os dados entram sem bloquear toda a tela;
- atualização: dados antigos válidos podem permanecer visíveis enquanto a versão nova é buscada;
- erro de rede: o painel continua utilizável quando houver dado local válido e informa claramente o que não foi sincronizado.

## Limite técnico importante
Não é correto prometer latência zero em toda primeira consulta remota. Apps Script, rede móvel e serviços externos podem demorar. A solução é **não transformar essa latência em tela parada**. Para escala municipal e maior previsibilidade, a direção arquitetural aprovada do projeto é GitHub + Vercel, mantendo migração progressiva e sem desligar o que funciona antes da homologação.

## Ordem recomendada de migração
A ordem inicial recomendada é:
1. **Agendas e vagas** — primeiro caso, porque exige leitura, edição, publicação e atualização refletida corretamente no portal; também ataca um problema recorrente do sistema atual.
2. **Moradores** — cadastro, busca, atualização, família, CPF/CNS e isolamento territorial.
3. **Profissionais e serviços** — base para agendas e serviços dinâmicos.
4. **Recados e campanhas** — publicação, status e recebimento.
5. **Suporte aos moradores** — notificações, aparelhos, chamados e reparos.
6. **TACS e áreas** — território, agentes e novas áreas.
7. **Municípios e organizações** — estrutura multiárea/multimunicípio.
8. **Portal do Morador** — integração final com a área pública.

## Gate de cada painel
Um painel só substitui o antigo depois de passar por:
- abertura e retorno sem recarga total;
- teste de leitura real;
- teste de escrita real quando aplicável;
- teste de cache e atualização em segundo plano;
- teste de isolamento por área;
- teste em iPhone e Android;
- confirmação de que não houve regressão em outro painel;
- aprovação do usuário.

## Primeiro bloco autorizado para planejamento técnico
Começar pelo módulo **Agendas e vagas**, sem alterar ainda os outros painéis. O primeiro objetivo funcional é garantir que uma edição administrativa apareça corretamente na Central e no Portal, sem depender de recarregamentos manuais ou cache antigo.

## Acesso canônico antes dos painéis

A camada de desempenho dos painéis começa no próprio acesso. Depois da criação do PIN e do reconhecimento do aparelho:

1. o PIN destrava localmente o último contexto/snapshot cifrado e previamente confirmado do perfil;
2. o shell e o último contexto válido aparecem sem esperar o Apps Script;
3. módulos já visitados reutilizam memória/snapshot local;
4. a sincronização remota ocorre em paralelo;
5. dados alterados são substituídos somente quando a versão/consulta remota confirma mudança;
6. operações críticas nunca são confirmadas somente por snapshot e aguardam uma sessão remota nova.

Metas de homologação:
- resposta visual ao toque: abaixo de 100 ms;
- desbloqueio local do PIN: alvo de 100–300 ms no aparelho;
- retorno a painel já carregado: alvo de 100–200 ms;
- latência remota não pode transformar a aplicação em tela parada.

Esses números são metas de teste, não podem ser declarados atingidos sem medição real.


## Tarefa 1 autorizada — Perfil UBS
Em 12/09/2026 foi autorizada a primeira tarefa da evolução do acesso único:

- incluir **UBS** como quarto perfil disponível no primeiro acesso, ao lado de Administrador, TACS e Morador;
- ampliar o cadastro de acessos para **Administrador / TACS / UBS**;
- o cadastro UBS deve armazenar nome do responsável, função na UBS, unidade vinculada, PIN e permissões;
- o perfil UBS desta tarefa é isolado; combinações envolvendo UBS ficam para a Tarefa 2;
- a confirmação do primeiro acesso UBS não cria vínculo permanente do computador nesta tarefa; o reconhecimento do aparelho e a experiência da segunda entrada pertencem à tarefa específica posterior;
- nenhuma mudança desta tarefa autoriza alterar regras internas dos painéis existentes.


### Status final da Tarefa 1: VALIDADA — 12/09/2026
Validação técnica concluída: suíte integral aprovada, Apps Script versão 196 implantado com health checks aprovados e GitHub Pages publicado. Nenhuma combinação UBS da Tarefa 2 foi antecipada.


## Tarefa 2 autorizada — Combinações de perfis com UBS
A Tarefa 2 mantém os perfis existentes e acrescenta as combinações autorizadas com UBS, preservando também **UBS pura**.

Matriz canônica desta tarefa:
`ADMIN_TACS_UBS_MORADOR`
`ADMIN_TACS_UBS`
`ADMIN_UBS_MORADOR`
`TACS_UBS_MORADOR`
`ADMIN_UBS`
`TACS_UBS`
`UBS_MORADOR`
`ADMIN_TACS_MORADOR`
`ADMIN_TACS`
`ADMIN_MORADOR`
`TACS_MORADOR`
`TACS`
`ADMIN`
`UBS`

Regras:
- as quatro portas de entrada continuam Administrador, TACS, Morador e UBS;
- combinações não viram novas portas;
- perfis com TACS mantêm regras territoriais de TACS;
- perfis com UBS mantêm função e unidade UBS obrigatórias;
- perfis com TACS + UBS cumprem os dois conjuntos;
- reconhecimento persistente do aparelho e segundo acesso ficam para tarefa posterior.


### Status da Tarefa 2: VALIDADA INTERNAMENTE E PUBLICADA — 12/09/2026
A matriz canônica de 14 perfis foi aprovada pelos gates automatizados, incluindo **UBS pura**. Apps Script versão 200 foi implantado com health checks aprovados e GitHub Pages publicado. A matriz permanece válida; a validação global em aparelhos reais integra a etapa final obrigatória de testes.


## Tarefa 3 autorizada — Identidade real após o acesso
Após autenticação, a interface deve exibir a identidade real no formato **nome completo + perfil cadastrado**, sem reduzir combinações a um rótulo genérico.

Exemplos:
- `Mércio José Campos dos Santos — Administrador + TACS`;
- `Manuel … — TACS`;
- `Júlia Maria da Silva — UBS`.

Regras:
- Administrador e TACS usam o cadastro autenticado real;
- UBS devolve e mostra o perfil efetivamente cadastrado, inclusive combinações com UBS;
- Morador autenticado mostra `nome — Morador`;
- reconhecimento persistente do aparelho, segundo acesso específico e modo diagnóstico permanecem fora desta tarefa e pertencem às tarefas seguintes.

### Status final da Tarefa 3: VALIDADA INTERNAMENTE E PUBLICADA — 12/09/2026
Gate específico: `TAREFA_3_IDENTIDADE_REAL_OK`.

Validação concluída no RETRY_3: suíte integral aprovada, workflow Apps Script run `34718306192` aprovado, versão **201** criada e implantada no mesmo deployment e health checks aprovados na primeira tentativa. O GitHub Pages do disparo também concluiu com sucesso no run `34718300856`.

O limite de 200 versões foi saneado preservando as versões recentes `189–199`, e o workflow permanece corrigido para consumir apenas uma nova versão por implantação.

**Regra de sequência cumprida:** a Tarefa 3 está fechada tecnicamente e a Tarefa 4 pode ser iniciada, sem antecipar nenhuma regra das tarefas posteriores.

## Tarefa 4 autorizada — Reconhecimento do aparelho e perfil no segundo acesso
Depois do primeiro acesso confirmado, o Conecta reconhece localmente a porta correspondente ao perfil já utilizado no aparelho e solicita somente o PIN para a nova entrada.

Regras:
- Administrador, TACS, Morador e UBS são reconhecidos como as quatro portas canônicas;
- combinações de perfis continuam sendo identidade/permissões, não novas portas;
- nenhum nome pessoal é exibido antes da autenticação;
- Administrador e TACS reutilizam o cofre local cifrado e sincronizam a sessão remota depois;
- Morador mantém o vínculo rápido já existente e entra por PIN;
- UBS passa a ter vínculo seguro do aparelho e segundo acesso por PIN;
- as outras portas do Administrador permanecem disponíveis;
- modo diagnóstico administrativo do Morador fica fora desta tarefa.

### Status final da Tarefa 4: VALIDADA INTERNAMENTE E PUBLICADA — 12/09/2026
Gate específico `TAREFA_4_RECONHECIMENTO_APARELHO_PERFIL_OK` aprovado dentro da suíte integral. Apps Script versão **202** implantado no mesmo deployment pelo run `34718800583`, com health checks aprovados na primeira tentativa. GitHub Pages run `34718794886` concluído com sucesso.

**Regra de sequência cumprida:** a Tarefa 4 está fechada tecnicamente e a Tarefa 5 pode ser iniciada.
