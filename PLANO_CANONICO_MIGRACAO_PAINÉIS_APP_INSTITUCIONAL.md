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