(function () {
  'use strict';

  var STORAGE_PENDING = 'portalTacsNotificacoesPendente';
  var STORAGE_ENABLED = 'portalTacsNotificacoesAtivas';
  var oneSignalStarted = false;
  var oneSignalInstance = null;

  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isAndroid() { return /android/i.test(navigator.userAgent); }
  function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function wantsNotificationsFromUrl() { try { return new URLSearchParams(window.location.search).get('notificacoes') === '1'; } catch (error) { return false; } }

  function ensureStyles() {
    if (document.getElementById('portal-notificacoes-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-notificacoes-style';
    style.textContent = '.notification-offer{margin-top:18px;padding:22px;border:2px solid #0d5f8a;border-radius:18px;background:#f4fbff;color:#082b43}.notification-offer[hidden]{display:none!important}.notification-offer h3{margin:0 0 10px;font-size:28px;line-height:1.2}.notification-offer p{margin:10px 0;line-height:1.5;font-size:18px}.notification-offer button{width:100%;margin-top:14px;padding:18px 20px;border:0;border-radius:14px;background:#086b9b;color:#fff;font-size:21px;font-weight:900}.notification-offer button:disabled{opacity:.65}.notification-offer .notification-status{font-weight:850}.notification-offer .notification-help{font-size:17px;color:#405866}.notification-offer .notification-ok{color:#1c7a42;font-weight:900}.notification-offer .notification-denied{color:#a94b00;font-weight:900}.notification-guide{margin-top:18px;padding:16px;border:1px solid #9fb9c7;border-radius:14px;background:#fff}.notification-guide strong{display:block;margin-bottom:8px;font-size:20px}.notification-guide p{margin:8px 0;font-size:17px;color:#314b59}';
    document.head.appendChild(style);
  }

  function createOffer() {
    var existing = document.getElementById('notificationOffer');
    if (existing) return existing;
    var send = document.getElementById('send');
    if (!send || !send.parentNode) return null;

    var box = document.createElement('section');
    box.id = 'notificationOffer';
    box.className = 'notification-offer';
    box.hidden = true;
    box.innerHTML = '<h3>Receber avisos da Unidade de Saúde</h3>' +
      '<p>Ative as notificações para ser avisado quando houver novo comunicado no Portal TACS.</p>' +
      '<p class="notification-status" id="notificationStatus"></p>' +
      '<button type="button" id="notificationButton">Ativar e permitir notificações</button>' +
      '<p class="notification-help" id="notificationHelp"></p>' +
      '<div class="notification-guide"><strong>Como instalar no celular</strong>' +
      '<p><b>iPhone:</b> Safari → Compartilhar → Adicionar à Tela de Início → abra pelo ícone criado → toque em “Ativar e permitir notificações”.</p>' +
      '<p><b>Android:</b> Chrome → menu ⋮ → Instalar app ou Adicionar à tela inicial → abra o portal → toque em “Ativar e permitir notificações”.</p></div>';
    send.insertAdjacentElement('afterend', box);
    return box;
  }

  function setPending() { try { localStorage.setItem(STORAGE_PENDING, '1'); } catch (error) {} setTimeout(configureOffer, 0); }
  function shouldShowOffer() {
    if (isStandalone()) return true;
    if (wantsNotificationsFromUrl()) return true;
    try { return localStorage.getItem(STORAGE_PENDING) === '1' || localStorage.getItem(STORAGE_ENABLED) === '1'; }
    catch (error) { return false; }
  }
  function installSendHook() { var send = document.getElementById('send'); if (!send || send.dataset.notificationHook === '1') return; send.dataset.notificationHook = '1'; send.addEventListener('click', setPending, true); }

  function clearStateClasses(status) {
    status.classList.remove('notification-ok');
    status.classList.remove('notification-denied');
  }

  function showEnabled(status, button, help) {
    clearStateClasses(status);
    status.textContent = '✓ Notificações ativadas neste aparelho.';
    status.classList.add('notification-ok');
    button.textContent = 'Notificações ativadas';
    button.disabled = true;
    button.onclick = null;
    help.textContent = 'Este aparelho receberá os novos avisos publicados no Portal TACS.';
    try { localStorage.setItem(STORAGE_ENABLED, '1'); localStorage.removeItem(STORAGE_PENDING); } catch (error) {}
  }

  function showDenied(status, button, help) {
    clearStateClasses(status);
    status.textContent = 'A permissão foi negada neste iPhone.';
    status.classList.add('notification-denied');
    button.textContent = 'Como reativar nas Configurações';
    button.disabled = false;
    help.textContent = 'O iPhone não mostra novamente a janela de autorização depois que “Não Permitir” é escolhido.';
    button.onclick = function () {
      window.alert('Para reativar:\n\n1. Abra Ajustes do iPhone.\n2. Toque em Apps.\n3. Procure Atendimento TACS.\n4. Toque em Notificações.\n5. Ative Permitir Notificações.\n6. Volte ao Portal TACS.');
    };
    try { localStorage.removeItem(STORAGE_ENABLED); } catch (error) {}
  }

  function showReady(status, button, help, OneSignal) {
    clearStateClasses(status);
    status.textContent = 'Toque no botão para autorizar os avisos neste aparelho.';
    help.textContent = isAndroid() ? 'O Android mostrará a janela oficial de permissão.' : 'O iPhone mostrará a janela oficial de permissão.';
    button.textContent = 'Ativar e permitir notificações';
    button.disabled = false;
    button.onclick = async function () {
      button.disabled = true;
      status.textContent = 'Aguardando sua autorização...';
      try {
        await OneSignal.Notifications.requestPermission();
        syncPermissionUi(OneSignal, status, button, help);
      } catch (error) {
        status.textContent = 'Não foi possível ativar agora.';
        help.textContent = 'Feche e abra novamente o Portal TACS pelo ícone instalado e tente de novo.';
        button.disabled = false;
      }
    };
  }

  function syncPermissionUi(OneSignal, status, button, help) {
    var permission = (typeof Notification !== 'undefined' && Notification.permission) ? Notification.permission : '';
    if (OneSignal && OneSignal.Notifications && OneSignal.Notifications.permission) {
      showEnabled(status, button, help);
      return;
    }
    if (permission === 'denied') {
      showDenied(status, button, help);
      return;
    }
    showReady(status, button, help, OneSignal);
  }

  function configureOneSignal(button, status, help) {
    if (oneSignalInstance) {
      syncPermissionUi(oneSignalInstance, status, button, help);
      return;
    }
    if (oneSignalStarted) return;
    oneSignalStarted = true;
    var config = window.PORTAL_TACS_NOTIFICACOES || {};
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('Navegador sem suporte a notificações web.');
        await OneSignal.init({
          appId: config.appId,
          safari_web_id: config.safariWebId,
          serviceWorkerPath: config.serviceWorkerPath || 'push/OneSignalSDKWorker.js',
          serviceWorkerParam: config.serviceWorkerParam || { scope: '/atendimento-acs-farmaceutico/push/' },
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: false
        });
        oneSignalInstance = OneSignal;
        syncPermissionUi(OneSignal, status, button, help);
      } catch (error) {
        oneSignalStarted = false;
        console.error('Portal TACS - erro ao iniciar notificações:', error);
        status.textContent = 'O serviço de notificações não conseguiu iniciar.';
        help.textContent = 'Feche e abra novamente o portal e tente de novo.';
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
    clearStateClasses(status);

    if (isIos() && !isStandalone()) {
      status.textContent = 'Ainda não ativado neste iPhone.';
      help.textContent = 'Adicione o Portal TACS à Tela de Início e abra pelo ícone criado.';
      button.textContent = 'Instale o Portal para ativar avisos';
      button.disabled = true;
      button.onclick = null;
      return;
    }

    if (!config.appId) {
      status.textContent = 'A ativação das notificações ainda está sendo finalizada.';
      help.textContent = 'A conexão com o serviço de envio ainda não foi concluída.';
      button.disabled = true;
      return;
    }

    if (isAndroid()) help.textContent = 'No Android, use o Chrome. A instalação na tela inicial é recomendada.';
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
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) configureOffer();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());