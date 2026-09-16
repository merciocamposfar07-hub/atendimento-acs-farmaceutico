# Registro canônico — pré-carregamento real dos painéis

Data: 2026-09-16

## Regra aprovada

Depois que a sessão e a área forem confirmadas, os painéis permitidos ao perfil devem começar a preparar estrutura e dados em segundo plano. O primeiro toque em um painel não deve iniciar o módulo do zero quando a Central já teve tempo de prepará-lo.

Fluxo esperado:

1. PIN/sessão validada.
2. Central Administrativa exibida.
3. Assets dos painéis são aquecidos.
4. Runtimes e leituras dos painéis permitidos iniciam em segundo plano de forma escalonada.
5. Ao tocar em Moradores, Agendas, Profissionais, Recados, Suporte e demais painéis permitidos, a Central revela/reutiliza a instância já preparada.
6. Ao voltar à Central, o painel permanece preservado durante a mesma sessão e área.
7. Mudança de área, logoff ou troca de escopo cancela o pré-carregamento anterior e desmonta apenas o escopo antigo.

## Isolamento da correção

Bloco: `PRECARREGAMENTO_REAL_PAINEIS_2026_09_16_V1`

Arquivo funcional: `central-administrativa-tacs.js`

A correção não altera:
- permissões;
- isolamento entre áreas;
- regras de escrita;
- dados armazenados;
- rotas funcionais;
- layout dos painéis;
- autenticação por PIN.

O carregamento é escalonado para evitar disparar todas as consultas ao mesmo tempo.
