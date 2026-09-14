# Registro — Abertura imediata dos painéis da UBS

Data: 13/09/2026

## Escopo autorizado
Correção limitada à demora observada depois de tocar em **Acessar painéis da UBS**, quando a tela permanecia em `Abrindo os painéis da UBS…`.

Não fazem parte desta correção: regras de PIN, cadastro, permissões, Morador, TACS, Administrador, vagas, gravações ou layout dos painéis.

## Diagnóstico
A correção anterior de abertura imediata dependia de `r.areas` vir preenchido no retorno do login UBS. A correção posterior que tornou o PIN rápido passou intencionalmente a devolver `areas: []`. Com isso, o frontend deixou de usar o caminho rápido e voltou obrigatoriamente para `loadContext()`.

Além disso, no primeiro carregamento remoto da UBS, o backend fazia leituras territoriais repetidas na mesma requisição: a validação da sessão lia TACS/áreas e `admin_territorio_dados` voltava a ler as mesmas estruturas.

## Bloco isolado A — contexto local validado da UBS
Arquivo: `central-administrativa-tacs.js`.

Fluxo:
`PIN UBS válido → cartão UBS autenticada → tocar Acessar painéis → validar último contexto da MESMA UBS → abrir Central/painéis imediatamente → sincronizar em segundo plano`.

Regras:
- snapshot UBS preservado em `sessionStorage` e também em `localStorage` no computador reconhecido;
- cache só é aceito quando `cadastroId` e `unidadeId` correspondem à UBS autenticada;
- cache de outra UBS é rejeitado;
- sincronização remota continua obrigatória;
- Administrador, TACS e Morador não usam este bloco.

## Bloco isolado B — remover releituras territoriais da UBS
Arquivos:
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`;
- `apps-script/ZZZZ_17_TacsAreasAdminV1.gs`.

Fluxo:
`validar sessão UBS → ler TACS uma vez → ler áreas uma vez → reutilizar o mesmo snapshot em admin_territorio_dados → devolver contexto`.

Antes, a mesma abertura podia reler TACS até três vezes e áreas duas vezes dentro da mesma operação. Agora, somente no perfil UBS, `contextoUbsInterno` transporta o snapshot já lido durante a validação para a montagem do contexto.

Administrador e TACS continuam no fluxo anterior.

## Publicação
Frontend:
- `521ca8db2a5302b3c9f2ea0bc561520f091efdd4` — contexto UBS local validado;
- `c4cbaf5e715a42bfe1269ec225a7207cc0e5d822` — renovação de cache do shell;
- `66941049e75529be66736f90edb725630f964b3f` — release integral gerado automaticamente.

Backend:
- `d1c6a720a4a335ee355d72d296d1bd40e291b4e8` — reutilização do snapshot territorial na validação UBS;
- `3a3bc1cf4624f1f968885ca4ab72ec292a066e2c` — eliminação das releituras em `admin_territorio_dados`;
- `34fffb8ac0c51cfe4ee5a41e6969f90805426e53` — solicitação de implantação;
- Apps Script produção: **versão 217**.

## Validação executada
Frontend:
- sintaxe de `central-administrativa-tacs.js`: OK;
- marcador `CORRECAO_CIRURGICA_ABERTURA_UBS_CACHE_V1`: presente uma vez;
- teste simulado com mesma UBS: cache aceito e renderização acionada;
- teste simulado com UBS diferente: cache recusado.

Backend:
- sintaxe dos dois módulos alterados: OK antes da publicação;
- workflow de implantação `34794709509`: **success**;
- substituição somente dos módulos autorizados: **success**;
- implantação no mesmo deployment: **success**;
- health check da primeira tentativa: moradores, território, CSV, manutenção, isolamento, agendas, painéis públicos e conteúdo: **todos aprovados**;
- Apps Script avançou da versão 216 para **217**.

GitHub Pages:
- build/deploy do commit de publicação: **success**.

## Validação real no dispositivo — 13/09/2026
O usuário executou o fluxo real após a publicação e confirmou que:
- a busca/identificação da UBS passou a responder com agilidade;
- o acesso por **Acessar painéis da UBS** passou a abrir os painéis de forma ágil;
- o comportamento observado corresponde ao objetivo deste bloco: retirar releituras e esperas remotas desnecessárias do caminho crítico sem dispensar a sincronização do servidor.

Esta confirmação encerra **somente este bloco isolado de desempenho da UBS**. Não constitui validação automática de Administrador, TACS, Morador ou de outras correções de 13/09/2026.

## Estado final
**VALIDADA NO DISPOSITIVO, PUBLICADA E CANONIZADA — 13/09/2026.**

Este bloco passa a ser referência canônica do desempenho de acesso/painéis da UBS. Alterações futuras não relacionadas não devem remover, substituir ou contornar `CORRECAO_CIRURGICA_ABERTURA_UBS_CACHE_V1` ou `CORRECAO_CIRURGICA_UBS_CONTEXTO_SEM_RELEITURA_V1` sem alteração explicitamente autorizada e registrada.
