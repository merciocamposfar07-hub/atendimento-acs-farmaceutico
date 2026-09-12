# Registro canônico — Tarefa 10 — Sessão única e shell persistente

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

## Objetivo exclusivo da Tarefa 10
Manter a Central do Conecta Saúde Comunitária montada durante a navegação interna e preservar uma única sessão autenticada ao alternar entre os módulos.

Fluxo esperado:
`Central → Agendas → Central → Profissionais → Central → Recados`

Sem novo PIN, sem novo login e sem reconstruir um módulo que já está carregado no mesmo perfil/área.

## Regras implementadas
- a Central é a única autoridade de navegação interna;
- módulos administrativos são carregados sob demanda dentro do shell;
- um módulo já carregado é reutilizado ao ser aberto novamente;
- tocar em `Central` apenas oculta o módulo atual; não descarrega seu documento;
- Agendas não abandona mais a Central por `location.assign`;
- no Safari/iPhone, o iframe do módulo só começa a carregar depois que shell e frame já estão visíveis;
- troca de área elimina módulos do escopo anterior;
- logoff explícito elimina os módulos da sessão encerrada;
- recusa real de autenticação elimina o shell protegido;
- `pageshow`/BFCache não descarrega módulos nem força retorno ao PIN;
- os roteadores legados permanecem apenas como fallback e cedem ao shell canônico.

## Limites desta tarefa
A Tarefa 10 não implementa antecipadamente:
- política de carregamento imediato/stale-while-revalidate dos módulos da Tarefa 11;
- versionamento/frescura de cache da Tarefa 12;
- deduplicação central de requisições da Tarefa 13;
- regra definitiva de timeout da Tarefa 14;
- histórico/back interno da Tarefa 15;
- migração funcional definitiva painel a painel da Tarefa 16.

## Gate obrigatório
`scripts/test_tarefa10_sessao_shell_persistente.js`

Saída esperada:
`TAREFA_10_SESSAO_SHELL_PERSISTENTE_OK`

A Tarefa 10 só será concluída após gate específico, suíte integral, implantação Apps Script/health checks e GitHub Pages passarem com sucesso.
