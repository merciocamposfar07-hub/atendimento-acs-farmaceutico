(function () {
  'use strict';

  var STORAGE_PENDING = 'portalTacsNotificacoesPendente';
  var STORAGE_ENABLED = 'portalTacsNotificacoesAtivas';
  var oneSignalStarted = false;

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function wantsNotificationsFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get('notificacoes') === '1';
    } catch (error) {
      return false;
    }
  }

  function ensureStyles() {
    if (document.getElementById('portal-notificacoes-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-notificacoes-style';
    style.textContent = '.notification-offer{margin-top:18px;padding:20px;border:2px solid #0d5f8a;border-radius:18px;background:#f4fbff;color:#082b43}.notification-offer[hidden]{display:none!important}.notification-offer h3{margin:0 0 8px;font-size:24px}.notification-offer p{margin:8px 0;line-height:1.5}.notification-offer button{width:100%;margin-top:12px;padding:15px 18px;border:0;border-radius:14px;background:#086b9b;color:#fff;font-size:18px;font-weight:850}.notification-offer button:disabled{opacity:.6}.notification-offer .notification-status{font-weight:800}.notification-offer .notification-help{font-size:15px;color:#405866}';
    document.head.appendChild(style);
  }

  function createOffer() {
    if (document.getElementById('notificationOffer')) return document.getElementById('notificationOffer');
    var send = document.getElementById('send');
    if (!send || !send.parentNode) return null;

    var box = document.createElement('section');
    box.id = 'notificationOffer';
    box.className = 'notification-offer';
    box.hidden = true;
    box.innerHTML = '<h3>Receber avisos da Unidade de Saúde</h3>' +
      '<p>Ative as notificações para ser avisado quando houver novo comunicado no Portal TACS.</p>' +
      '<p class="notification-status" id="notificationStatus"></p>' +
      '<button type="button" id="notificationButton">Ativar notificações</button>' +
      '<p class="notification-help" id="notificationHelp"></p>';

    send.insertAdjacentElement('afterend', box);
    return box;
  }

  function setPending() {
    try { localStorage.setItem(STORAGE_PENDING, '1'); } catch (error) {}
    setTimeout(configureOffer, 0);
  }

  function shouldShowOffer() {
    if (wantsNotificationsFromUrl()) return true;
    try {
      return localStorage.getItem(STORAGE_PENDING) === '1' || localStorage.getItem(STORAGE_ENABLED) === '1';
    } catch (error) {
      return false;
    }
  }

  function installSendHook() {
    var send = document.getElementById('send');
    if (!send || send.dataset.notificationHook === '1') return;
    send.dataset.notificationHook = '1';
    send.addEventListener('click', setPending, true);
  }

  function showEnabled(status, button) {
    status.textContent = 'Notificações ativadas neste aparelho.';
    button.textContent = 'Notificações ativadas';
    button.disabled = true;
    try {
      localStorage.setItem(STORAGE_ENABLED, '1');
      localStorage.removeItem(STORAGE_PENDING);
    } catch (error) {}
  }

  function configureOneSignal(button, status, help) {
    if (oneSignalStarted) return;
    oneSignalStarted = true;

    var config = window.PORTAL_TACS_NOTIFICACOES || {};
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId: config.appId,
          serviceWorkerPath: config.serviceWorkerPath || 'push/OneSignalSDKWorker.js',
          serviceWorkerParam: config.serviceWorkerParam || { scope: '/atendimento-acs-farmaceutico/push/' },
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: false
        });

        if (OneSignal.Notifications.permission) {
          showEnabled(status, button);
          return;
        }

        status.textContent = 'Toque no botão para autorizar os avisos neste aparelho.';
        help.textContent = 'O iPhone mostrará a janela oficial de permissão após o toque.';

        if (button.dataset.permissionBound !== '1') {
          button.dataset.permissionBound = '1';
          button.addEventListener('click', async function () {
            button.disabled = true;
            status.textContent = 'Aguardando sua autorização...';
            try {
              await OneSignal.Notifications.requestPermission();
              if (OneSignal.Notifications.permission) {
                showEnabled(status, button);
              } else {
                status.textContent = 'A permissão não foi concedida.';
                button.disabled = false;
              }
            } catch (error) {
              status.textContent = 'Não foi possível ativar agora. Tente novamente.';
              button.disabled = false;
            }
          });
        }
      } catch (error) {
        oneSignalStarted = false;
        status.textContent = 'Não foi possível iniciar as notificações agora.';
        help.textContent = 'Feche e abra novamente o Portal TACS pelo ícone da Tela de Início.';
        button.disabled = false;
      }
    });
  }

  function configureOffer() {
    var box = createOffer();
    if (!box || !shouldShowOffer()) return;

    var config = window.PORTAL_TACS_NOTIFICACOES || {};
    var button = document.getElementById('notificationButton');
    var status = document.getElementById('notificationStatus');
    var help = document.getElementById('notificationHelp');

    box.hidden = false;

    if (isIos() && !isStandalone()) {
      status.textContent = 'No iPhone, adicione primeiro o Portal TACS à Tela de Início.';
      help.textContent = 'Toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra o portal pelo novo ícone e toque em Ativar notificações.';
      button.textContent = 'Como adicionar à Tela de Início';
      button.disabled = false;
      if (button.dataset.homeBound !== '1') {
        button.dataset.homeBound = '1';
        button.addEventListener('click', function () {
          help.textContent = 'No Safari: Compartilhar → Adicionar à Tela de Início → Adicionar.';
        });
      }
      return;
    }

    if (!config.appId) {
      status.textContent = 'A ativação das notificações ainda está sendo finalizada.';
      help.textContent = 'O Portal TACS já está preparado, mas a chave do serviço de envio ainda precisa ser conectada.';
      button.disabled = true;
      return;
    }

    button.textContent = 'Ativar notificações';
    button.disabled = false;
    configureOneSignal(button, status, help);
  }

  function loadSdk() {
    var config = window.PORTAL_TACS_NOTIFICACOES || {};
    if (!config.appId || document.querySelector('script[data-onesignal-sdk]')) return;
    var script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.dataset.onesignalSdk = '1';
    document.head.appendChild(script);
  }

  function install() {
    ensureStyles();
    installSendHook();
    loadSdk();
    configureOffer();
    window.addEventListener('pageshow', configureOffer);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());