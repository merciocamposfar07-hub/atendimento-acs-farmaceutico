# Registro — Abertura imediata dos painéis da UBS

Data: 13/09/2026

## Escopo autorizado
Correção limitada à demora observada depois de tocar em **Acessar painéis da UBS**, quando a tela permanecia em `Abrindo os painéis da UBS…`.

Não fazem parte desta correção: login/PIN, regras de cadastro, permissões, áreas, Morador, TACS, Administrador, vagas, gravações, layout dos painéis ou backend Apps Script.

## Diagnóstico
A correção anterior de abertura imediata dependia de `r.areas` vir preenchido no retorno do login UBS. A correção posterior que tornou o PIN rápido passou intencionalmente a devolver `areas: []`. Com isso, o frontend deixou de usar o caminho rápido e voltou obrigatoriamente para `loadContext()`, mantendo o usuário na tela de acesso enquanto o contexto territorial era relido no servidor.

## Bloco isolado — cache validado da UBS
Arquivo funcional: `central-administrativa-tacs.js`.

Fluxo:
`PIN UBS válido → cartão UBS autenticada → tocar Acessar painéis → procurar último contexto UBS válido do mesmo cadastro/unidade → abrir Central e painéis imediatamente → sincronizar contexto remoto em segundo plano`.

Regras:
- o snapshot UBS continua em `sessionStorage` e passa também a ser preservado em `localStorage` para o computador reconhecido da unidade;
- o cache só é aceito quando `cadastroId` e `unidadeId` correspondem à UBS que acabou de autenticar;
- cache de outra UBS é rejeitado;
- a sincronização remota continua obrigatória e acontece logo após a abertura;
- o backend não foi alterado;
- o fluxo de Administrador, TACS e Morador não foi alterado;
- se ainda não existir nenhum contexto local válido da UBS naquele computador, o fallback remoto existente continua sendo usado.

## Publicação
- `521ca8db2a5302b3c9f2ea0bc561520f091efdd4` — abertura imediata com contexto UBS local validado;
- `c4cbaf5e715a42bfe1269ec225a7207cc0e5d822` — renovação de cache do shell;
- `66941049e75529be66736f90edb725630f964b3f` — release integral gerado automaticamente com a nova referência.

## Validação interna
- sintaxe de `central-administrativa-tacs.js`: OK;
- marcador `CORRECAO_CIRURGICA_ABERTURA_UBS_CACHE_V1`: uma ocorrência;
- função `restoreUbsContextCache`: uma ocorrência;
- teste simulado com mesma UBS: cache aceito e renderização acionada;
- teste simulado com cadastro UBS diferente: cache recusado e nenhuma renderização indevida;
- referência do JavaScript da Central renovada.

## Estado
**PUBLICADA PARA TESTE NO DISPOSITIVO.**

Não marcar como concluída operacionalmente até o usuário testar no iPhone/computador da UBS e confirmar que o toque em **Acessar painéis da UBS** não permanece mais preso em `Abrindo os painéis da UBS…`.
