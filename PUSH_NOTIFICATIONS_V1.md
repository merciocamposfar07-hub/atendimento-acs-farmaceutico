# Portal TACS — Notificações Push V1

Branch: `stabilization/push-notifications-v1`

Base congelada da produção: `c129976a8e67d9f45890fa215ce0676a6c3bef53`

## Estado atual

**Gate 0 concluído em 08/08/2026.**

Auditoria realizada no projeto real `Portal TACS – Banco de Dados`, no projeto `Avisos TACS – Unidade de Saúde Posto Matias`, nos arquivos históricos enviados e no repositório GitHub.

Classificação: **AUSENTE** — não foi encontrada implementação servidor-servidor existente de push/OneSignal no Apps Script auditado. Não foram encontrados `OneSignal`, `UrlFetchApp` direcionado ao provedor, App API Key privada, `admin_publicar_notificacao`, `enviarPush`, `enviarNotificacao` ou rota equivalente de envio automático.

A infraestrutura histórica do lado do navegador/OneSignal existiu, mas o backend automático de envio não foi encontrado.

**Importante:** Gate 0 concluído não significa produção liberada. O estado continua `releaseAllowed:false` até concluir servidor, regressão, frontend e teste em aparelho real.

## Regra permanente de isolamento

Não substituir, apagar ou reescrever as rotinas que já funcionam. O push é uma extensão isolada.

- Agenda médica/nutricionista não é alterada.
- Agenda odontológica/reserva não é alterada.
- Fluxo WhatsApp não é alterado.
- `Código.gs` e `AvisosNovo.gs` do projeto de Avisos não são substituídos.
- Recados/campanhas continuam sendo gravados pelo fluxo atual.
- Falha do OneSignal nunca desfaz conteúdo publicado.
- `service-worker.js` da raiz permanece desativado.
- OneSignal usa somente `push/OneSignalSDKWorker.js`.
- A chave privada nunca fica no GitHub Pages.

## Objetivo

Fluxo único pretendido:

1. administrador salva recado/campanha;
2. gravação é confirmada pela releitura;
3. somente então o painel solicita o push;
4. módulo isolado do Apps Script autentica a sessão e chama o OneSignal;
5. aparelhos inscritos recebem a notificação;
6. toque na notificação abre o Portal do Morador.

## Componentes isolados

### Frontend público

- `notificacoes-config-v1.js`
- `portal-notificacoes-v1.js`
- `push/OneSignalSDKWorker.js`
- `manifest.webmanifest`
- `index.html`: somente vínculo do manifest e scripts V1 na branch; não publicado na `main` ainda.

### Painel administrativo

- `teste-v1/painel-recados-campanhas-v1.html`
- mantém o salvamento existente;
- só solicita push depois de releitura confirmada;
- não envia push ao remover/desfazer;
- não envia novamente se o conteúdo ativo não mudou;
- conteúdo inativo não gera push.

### Apps Script

Arquivo candidato: `apps-script/ZZZZ_14_NotificacoesPushPortalV1.gs`

- ação nova e exclusiva: `admin_publicar_notificacao`;
- exige sessão administrativa válida;
- lê segredo de Script Properties;
- deduplica publicações;
- usa idempotência no OneSignal;
- falha de push não altera conteúdo publicado;
- não substitui `doGet`/`doPost` centrais: envolve apenas a ação nova e delega as demais rotas anteriores.

## Configuração secreta

Somente no Apps Script real, quando iniciarmos o Gate 2:

- Nome: `ONESIGNAL_APP_API_KEY`
- Valor: App API Key privada do aplicativo OneSignal correspondente ao App ID público.

Nunca colocar o valor no GitHub, HTML, JavaScript público, print ou conversa.

App ID público já utilizado pelo Portal:

`e2294b98-c72b-4f8c-a055-de28979676dc`

## Gates restantes

### Gate 1 — código

O workflow `Portal TACS - Push Notifications Tests` deve estar verde no HEAD atual.

### Gate 2 — servidor

1. Adicionar **somente** `ZZZZ_14_NotificacoesPushPortalV1.gs` ao projeto Apps Script `Portal TACS – Banco de Dados`.
2. Não alterar `Portal.gs`, `Código.gs`, `05_AdminApiPortalTacsV1`, `ZZ_10...`, agendas, odontologia ou moradores.
3. Criar `ONESIGNAL_APP_API_KEY` em Script Properties sem expor seu valor.
4. Executar `testarConfiguracaoNotificacoesPushPortalV1()`; o diagnóstico não envia push.
5. O resultado deve indicar `ok:true`, `chaveConfigurada:true`, `nenhumEnvioRealizado:true`.
6. Só então realizar uma única atualização da implantação existente, mantendo o mesmo `/exec`.
7. Testar as rotas atuais antes de qualquer frontend de push entrar na `main`.

### Gate 3 — frontend

Somente depois do Gate 2 aprovado:

1. integrar apenas os componentes de push à versão aprovada da `main`;
2. confirmar GitHub Pages no SHA aprovado;
3. testar Portal, agendas, odontologia, formulário, WhatsApp e mural sem push;
4. somente depois habilitar uma inscrição de teste.

### Gate 4 — aparelho real

1. usar um único aparelho de teste;
2. ativar notificações;
3. confirmar inscrição no OneSignal;
4. criar um recado de teste ativo;
5. confirmar gravação/releitura primeiro e push depois;
6. confirmar recebimento fora do Portal;
7. tocar na notificação e confirmar abertura do Portal;
8. confirmar comportamento sonoro conforme o sistema operacional;
9. remover o recado e confirmar que remoção não gera outro push.

## Comportamento em falha

Se OneSignal/API estiver indisponível:

- recado/campanha permanece salvo;
- mural permanece atualizado;
- painel informa falha do push separadamente;
- não há rollback do conteúdo;
- não há repetição funcional do salvamento por causa do push.

## Deduplicação

O backend usa:

- `idempotency_key` por envio;
- fingerprint de conteúdo em cache por curto período;
- no máximo uma repetição técnica em 429/5xx com a mesma chave de idempotência.

O painel não pede push quando:

- publicação está inativa;
- registro ativo foi salvo sem mudança pública;
- registro é removido;
- operação `Desfazer` é executada.

## Som

Web Push não suporta som personalizado do OneSignal como um app nativo. A V1 não força arquivo de áudio. O comportamento sonoro é controlado pelo navegador/sistema operacional e pelas preferências de notificação do aparelho.

## Rollback

O subsistema é removível sem tocar nas funcionalidades centrais.

- frontend: retirar apenas os vínculos/scripts V1;
- administrativo: retirar somente o hook de push;
- servidor: retirar ou deixar inativo apenas `ZZZZ_14_NotificacoesPushPortalV1.gs`;
- não alterar `service-worker.js` raiz;
- não alterar agendas, odontologia, moradores, WhatsApp, `Código.gs` ou `AvisosNovo.gs`.

## Gate de regressão

Arquivo: `scripts/test_push_notifications_v1.js`

Ele bloqueia regressões estruturais, exposição de segredo, push antes da confirmação, push em remoção/undo, duplicidade e retry com nova chave de idempotência.
