# Correção cirúrgica — PIN TACS + Agendas no Safari — 2026-09-16

## Escopo

Bloco isolado para duas falhas reproduzidas no iPhone/Safari:

1. PIN TACS com 4 dígitos visíveis no campo sendo rejeitado como se estivesse incompleto.
2. Painel **Agendas e vagas** exibindo a mensagem de que o módulo nativo não pôde ser iniciado sem perder a sessão.

## Diagnóstico

O código atual de `central-tacs-login-rapido-v1.js` já contém a leitura do campo ativo no iPhone e o dono único do clique do PIN, porém `central-administrativa-tacs.html` ainda carregava esse arquivo com um cache-buster antigo. O Safari podia continuar executando uma revisão anterior.

O carregador de Agendas também ainda apontava para uma revisão antiga de `conecta-agendas-native-v1.js`. Além da atualização do cache-buster, foi adicionada uma única tentativa de recuperação que reinicia somente a instância nativa de Agendas antes de tentar montá-la novamente.

## Limites do bloco

Não altera backend, Apps Script, planilhas, permissões, isolamento entre áreas, regras de vagas, dados de moradores, autenticação de outros perfis, demais painéis ou regras de escrita.

## Validação automática

O gate verifica:

- revisão nova do bundle de PIN TACS no HTML publicado;
- presença das proteções de leitura do PIN ativo no iPhone;
- revisão nova do bundle nativo de Agendas;
- retry isolado de Agendas com `reset()` somente do módulo;
- ausência dos cache-busters antigos;
- sintaxe JavaScript dos arquivos afetados;
- alteração funcional limitada a `central-administrativa-tacs.html` e `central-administrativa-tacs.js`.

## Validação real pendente

Após a publicação, abrir no iPhone/Safari e testar:

- PIN TACS de 4 dígitos;
- entrada em **Agendas e vagas**;
- voltar à Central e reabrir **Agendas e vagas**.

A correção só deve ser considerada validada em aparelho real depois desse teste.
