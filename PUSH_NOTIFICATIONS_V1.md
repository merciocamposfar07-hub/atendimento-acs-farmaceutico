# Portal TACS — Notificações Push V1

Branch: `stabilization/push-notifications-v1`

Base congelada da produção: `c129976a8e67d9f45890fa215ce0676a6c3bef53`

## Estado atual

**Gate 0 concluído em 08/08/2026.**

Auditoria realizada no projeto real `Portal TACS – Banco de Dados`, no projeto `Avisos TACS – Unidade de Saúde Posto Matias`, nos arquivos históricos enviados e no repositório GitHub.

Classificação: **AUSENTE** — não foi encontrada implementação servidor-servidor existente de push/OneSignal no Apps Script auditado antes desta integração.

A infraestrutura histórica do lado do navegador/OneSignal existiu, mas o backend automático de envio não foi encontrado.

### Validação real concluída em 08/08/2026

O módulo isolado `ZZZZ_14_NotificacoesPushPortalV1.gs` foi instalado no Apps Script real e validado sem alterar agenda, odontologia, moradores, recados ou campanhas.

Foram confirmados:

- Script Property `ONESIGNAL_APP_API_KEY` configurada no Apps Script;
- `Authorization: Key <ONESIGNAL_APP_API_KEY>` aceito pelo OneSignal;
- envio direto para uma subscription real com HTTP 200 e recebimento no iPhone;
- envio coletivo com o segmento real `Total Subscriptions` com HTTP 200 e recebimento no iPhone;
- publicação de recado continua independente do resultado do push;
- remoção/undo não fazem parte da ação de push;
- chave privada continua fora do GitHub Pages.

Versão estabilizada do backend: **1.1.1**.

**Importante:** `releaseAllowed:false` continua mantido nesta branch porque a integração na `main` ainda não foi autorizada/concluída por este gate. A validação real do servidor e do aparelho não autoriza alterações paralelas no Portal.

## Regra permanente de isolamento

Não substituir, apagar ou reescrever as rotinas que já funcionam. O push é uma extensão isolada.

- Agenda médica/nutricionista não é alterada.
- Agenda odontológica/reserva não é alterada.
- Fluxo WhatsApp não é alterado.
- `Código.gs` e `AvisosNovo.gs` não são substituídos.
- Recados/campanhas continuam sendo gravados pelo fluxo atual.
- Falha do OneSignal nunca desfaz conteúdo publicado.
- `service-worker.js` da raiz permanece desativado.
- OneSignal usa somente `push/OneSignalSDKWorker.js`.
- A chave privada nunca fica no GitHub Pages.

## Fluxo estabilizado

1. administrador salva recado/campanha;
2. gravação é confirmada pela releitura;
3. somente então o painel solicita o push;
4. módulo isolado do Apps Script autentica a sessão;
5. backend lê a chave privada de Script Properties;
6. backend envia ao OneSignal para `Total Subscriptions`;
7. somente subscriptions aptas ao push recebem a notificação;
8. toque na notificação abre o Portal do Morador.

## Componentes isolados

### Frontend público

- `notificacoes-config-v1.js`
- `portal-notificacoes-v1.js`
- `push/OneSignalSDKWorker.js`
- `manifest.webmanifest`

### Painel administrativo

- `teste-v1/painel-recados-campanhas-v1.html`
- mantém o salvamento existente;
- só solicita push depois de releitura confirmada;
- não envia push ao remover/desfazer;
- não envia novamente se o conteúdo ativo não mudou;
- conteúdo inativo não gera push.

### Apps Script

Arquivo estabilizado: `apps-script/ZZZZ_14_NotificacoesPushPortalV1.gs`

- versão `1.1.1`;
- ação exclusiva `admin_publicar_notificacao`;
- exige sessão administrativa válida;
- lê `ONESIGNAL_APP_API_KEY` de Script Properties;
- remove espaços acidentais da chave antes do header;
- usa `Authorization: Key ...`;
- usa `Total Subscriptions` como alvo coletivo validado;
- deduplica publicações;
- usa idempotência no OneSignal;
- falha de push não altera conteúdo publicado;
- delega rotas que não pertencem ao push.

## Estado dos gates

- Apps Script audit: `COMPLETED`
- Instalação do servidor: `COMPLETED`
- Regressão do servidor: `COMPLETED`
- Teste em aparelho real: `COMPLETED`
- Integração controlada na main: `NOT_STARTED`
- `releaseAllowed:false`

## Comportamento em falha

Se OneSignal/API estiver indisponível:

- recado/campanha permanece salvo;
- mural permanece atualizado;
- painel informa falha do push separadamente;
- não há rollback do conteúdo;
- não há repetição funcional do salvamento por causa do push.

## Deduplicação

O backend usa:

- `idempotency_key` determinística por publicação;
- fingerprint de conteúdo em cache por curto período;
- no máximo uma repetição técnica em 429/5xx com a mesma chave de idempotência.

O painel não pede push quando:

- publicação está inativa;
- registro ativo foi salvo sem mudança pública;
- registro é removido;
- operação `Desfazer` é executada.

## Som

Web Push não força som personalizado nesta implementação. O comportamento sonoro é controlado pelo navegador/sistema operacional e pelas preferências do aparelho.

## Rollback

O subsistema é removível sem tocar nas funcionalidades centrais.

- frontend: retirar somente vínculos/scripts V1;
- administrativo: retirar somente o hook de push;
- servidor: retirar ou deixar inativo apenas `ZZZZ_14_NotificacoesPushPortalV1.gs`;
- não alterar `service-worker.js` raiz;
- não alterar agendas, odontologia, moradores, WhatsApp ou rotinas centrais.

## Gate de regressão

Arquivo: `scripts/test_push_notifications_v1.js`

O teste bloqueia regressões estruturais, exposição de segredo, retorno ao segmento inexistente `Subscribed Users`, mudança indevida do header de autorização, push antes da confirmação, push em remoção/undo, duplicidade e retry com nova chave de idempotência.
