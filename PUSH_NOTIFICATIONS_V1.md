# Portal TACS — Notificações Push V1

Branch: `stabilization/push-notifications-v1`

Base congelada da produção: `c129976a8e67d9f45890fa215ce0676a6c3bef53`

## REGRA DE SEGURANÇA — GATE 0 OBRIGATÓRIO

**Não adicionar módulo, não criar propriedade secreta, não atualizar implantação e não integrar esta branch à `main` antes de auditar o Apps Script real que está em produção.**

A auditoria deve verificar, no projeto Apps Script `Portal TACS – Banco de Dados`, se já existe qualquer implementação total ou parcial de notificações. Procurar por:

- `OneSignal`, `ONESIGNAL`, `push`, `notificacao`, `notificação`;
- chamadas a `UrlFetchApp.fetch` direcionadas ao OneSignal ou outro provedor de push;
- propriedades como `ONESIGNAL_APP_API_KEY`, `REST_API_KEY`, `ONESIGNAL_APP_ID` ou equivalentes;
- rotas/ações como `admin_publicar_notificacao`, `enviarNotificacao`, `enviarPush` ou equivalentes;
- gatilhos instaláveis que possam enviar avisos;
- wrappers de `doGet`, `doPost`, `tratarGetPainelTacs_` ou `tratarPostPainelTacs_` relacionados a notificações.

Resultado obrigatório do Gate 0:

1. **Se já existir fluxo funcional:** não instalar `ZZZZ_14_NotificacoesPushPortalV1.gs`. Primeiro comparar o fluxo existente com esta V1 e consolidar uma única implementação.
2. **Se existir fluxo parcial/antigo:** não empilhar outra implementação. Mapear o que permanece útil, desativar duplicidade de forma controlada e manter uma única rota oficial.
3. **Se não existir envio servidor-servidor:** somente então o módulo V1 pode ser candidato à instalação.
4. Nenhuma chave privada deve ser exibida, fotografada, enviada ao chat ou copiada para o GitHub.

Enquanto essa auditoria não estiver concluída, o estado oficial é: **NÃO LIBERADO PARA PRODUÇÃO**.

## Objetivo

Entregar notificações push para novos recados e campanhas sem transformar o push em dependência crítica do Portal do Morador.

Fluxo pretendido:

1. administrador salva recado/campanha;
2. gravação é confirmada pela releitura da planilha;
3. somente então o painel solicita o push;
4. Apps Script autentica a sessão e chama o OneSignal no servidor;
5. aparelhos inscritos recebem a notificação;
6. toque na notificação abre o Portal do Morador.

## Princípios de isolamento

- Agenda médica/nutricionista não é alterada.
- Agenda odontológica/reserva não é alterada.
- Fluxo WhatsApp não é alterado.
- Mural de recados/campanhas continua funcionando mesmo se o OneSignal falhar.
- `service-worker.js` da raiz permanece desativado; não reativar cache por causa do push.
- OneSignal usa o worker separado `push/OneSignalSDKWorker.js`.
- O SDK do OneSignal não é carregado no caminho crítico de abertura do Portal. Ele é carregado sob demanda ou em idle quando já existe permissão.
- A chave privada do OneSignal nunca fica no GitHub Pages.

## Arquivos da função

### Frontend público

- `notificacoes-config-v1.js`
- `portal-notificacoes-v1.js`
- `push/OneSignalSDKWorker.js` (já existente)
- `manifest.webmanifest`
- `index.html` — apenas vínculo do manifest e dos dois scripts V1

### Painel administrativo

- `teste-v1/painel-recados-campanhas-v1.html`
  - mantém o salvamento existente;
  - só solicita push depois de releitura confirmada;
  - não envia push ao remover/desfazer;
  - não envia novamente se conteúdo ativo não mudou;
  - conteúdo inativo não gera push.

### Apps Script — CANDIDATO, NÃO INSTALAR ANTES DO GATE 0

- `apps-script/ZZZZ_14_NotificacoesPushPortalV1.gs`
  - ação nova: `admin_publicar_notificacao`;
  - exige sessão administrativa válida;
  - lê segredo de Script Properties;
  - deduplica publicações;
  - usa idempotência no OneSignal;
  - falha de push nunca desfaz conteúdo publicado.

## Configuração secreta — SOMENTE DEPOIS DO GATE 0

Se a auditoria provar que não existe configuração equivalente e o módulo V1 for aprovado, criar no projeto Apps Script uma Script Property:

- Nome: `ONESIGNAL_APP_API_KEY`
- Valor: App API Key privada do aplicativo OneSignal correspondente ao App ID público já configurado.

**Nunca colocar o valor dessa chave no GitHub, HTML, JavaScript público, print ou conversa.**

App ID público usado pelo Portal:

`e2294b98-c72b-4f8c-a055-de28979676dc`

## Ordem de ativação

### Gate 0 — auditoria obrigatória do Apps Script real

1. Não alterar nenhum arquivo.
2. Mapear arquivos e pesquisar termos de notificação/push/OneSignal.
3. Verificar rotas, `UrlFetchApp`, propriedades e gatilhos relacionados.
4. Classificar o estado como `EXISTENTE_FUNCIONAL`, `EXISTENTE_PARCIAL` ou `AUSENTE`.
5. Somente `AUSENTE` autoriza instalar diretamente o módulo V1. Os outros estados exigem consolidação antes de qualquer instalação.

### Gate 1 — código

O workflow `Portal TACS - Push Notifications Tests` deve estar verde.

### Gate 2 — servidor

Somente se liberado pelo Gate 0:

1. Adicionar `ZZZZ_14_NotificacoesPushPortalV1.gs` ao projeto Apps Script existente, se realmente necessário.
2. Criar `ONESIGNAL_APP_API_KEY` somente se não existir propriedade equivalente já aprovada.
3. Executar `testarConfiguracaoNotificacoesPushPortalV1()`.
4. O retorno precisa indicar `ok:true`, `chaveConfigurada:true` e `nenhumEnvioRealizado:true`.
5. Atualizar a implantação **existente** do Web App; não criar outro Web App/endereço.
6. Confirmar que as rotas atuais de agenda, moradores, odontologia e administração continuam respondendo antes de publicar o frontend.

### Gate 3 — frontend

Somente depois do Gate 2:

1. integrar a branch de push à versão aprovada da `main`;
2. confirmar GitHub Pages publicado no SHA aprovado;
3. abrir o Portal e conferir agenda, odontologia, formulário, WhatsApp e mural antes de ativar uma inscrição push.

### Gate 4 — aparelho real

1. Em aparelho de teste, instalar/abrir o Portal no modo apropriado.
2. Tocar em `Ativar notificações`.
3. Confirmar inscrição no OneSignal.
4. Criar um recado de teste ativo pelo painel.
5. Confirmar no painel: gravação/releitura primeiro, push depois.
6. Confirmar recebimento da notificação fora do Portal.
7. Tocar na notificação e confirmar abertura do Portal.
8. Confirmar que o som/comportamento da notificação segue a configuração do sistema operacional do aparelho.
9. Remover o recado de teste e confirmar que remoção não gera novo push.

## Comportamento em falha

Se OneSignal/API estiver indisponível:

- recado/campanha permanece salvo;
- mural permanece atualizado;
- painel mostra que o conteúdo foi publicado, mas o push falhou;
- nenhuma gravação é reenviada automaticamente por causa do push;
- não há rollback do conteúdo por falha de notificação.

## Deduplicação

O backend usa:

- `idempotency_key` por operação de envio;
- fingerprint de conteúdo em cache por curto período;
- no máximo uma repetição técnica em erro transitório (429/5xx), reutilizando a mesma chave de idempotência.

O painel não pede push quando:

- publicação está inativa;
- registro ativo foi salvo sem mudança pública;
- registro é removido;
- operação `Desfazer` é executada.

## Som

A V1 não força arquivo de áudio customizado. A notificação é enviada como push normal e o comportamento sonoro é controlado pelo navegador/sistema operacional e pelas preferências de notificação do aparelho. Isso evita diferenças incompatíveis entre iOS e Android.

## Rollback

O subsistema foi desenhado para ser removível sem tocar nas funcionalidades centrais.

Rollback do frontend:

- remover do `index.html` o vínculo de `manifest.webmanifest?v=20260808-push-v1` somente se necessário voltar exatamente ao estado anterior;
- remover os dois scripts `notificacoes-config-v1.js` e `portal-notificacoes-v1.js`;
- restaurar o `start_url` anterior do manifest.

Rollback administrativo:

- restaurar `teste-v1/painel-recados-campanhas-v1.html` para a versão anterior ao hook de push.

Rollback servidor:

- o módulo `ZZZZ_14_NotificacoesPushPortalV1.gs` pode permanecer sem uso ou ser retirado; nenhuma função central depende dele.

Não alterar `service-worker.js` raiz durante rollback.

## Gate de regressão

Arquivo: `scripts/test_push_notifications_v1.js`

Ele bloqueia regressões estruturais, incluindo:

- perda dos scripts atuais de agenda/odontologia/WhatsApp;
- reativação acidental do worker raiz;
- exposição de chave privada no frontend;
- acoplamento do cliente push ao botão de WhatsApp;
- push antes da confirmação da releitura;
- push em remoção/undo;
- reenvio duplicado;
- retry com nova chave de idempotência.
