(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.PortalTacsNotificationReadinessV1) return;
  window.PortalTacsNotificationReadinessV1 = true;

  var BOX_ID = 'notificationReadiness';
  var STYLE_ID = 'notificationReadinessStyleV1';
  var VERIFY_ID = 'notificationReadinessVerify';
  var oneSignalRef = null;
  var renderTimer = null;

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function uuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(value).toLowerCase());
  }

  function platform() {
    var ua = String(navigator.userAgent || '');
    return {
      android: /Android/i.test(ua),
      ios: /iPhone|iPad|iPod/i.test(ua),
      standalone: Boolean(
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true
      )
    };
  }

  function areaId() {
    var area = '';
    try {
      if (window.PortalTacsArea && typeof window.PortalTacsArea.id === 'function') {
        area = window.PortalTacsArea.id();
      }
    } catch (error) {}
    if (!area) area = window.TACS_AREA_ID || '';
    if (!area && window.TACS_MORADOR_ATUAL) area = window.TACS_MORADOR_ATUAL.areaId || '';
    return text(area || 'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'JAPARANDUBA';
  }

  function areaName() {
    var identity = window.PortalTacsTerritoryIdentity || {};
    var name = text(identity.areaNome || identity.areaName || '');
    if (name) return name;
    var area = areaId();
    return area === 'JAPARANDUBA' ? 'Sítio Japaranduba' : area.replace(/_/g, ' ');
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#'+BOX_ID+'{margin-top:14px;padding:15px;border:2px solid #9fb9c7;border-radius:16px;background:#fff;color:#17394b}',
      '#'+BOX_ID+'[data-ready="1"]{border-color:#62b989;background:#effaf3}',
      '#'+BOX_ID+'[data-blocked="1"]{border-color:#d18b86;background:#fff4f3}',
      '#'+BOX_ID+' .nr-title{display:block;margin-bottom:10px;font-size:17px;font-weight:950;line-height:1.35}',
      '#'+BOX_ID+' .nr-list{display:grid;gap:8px}',
      '#'+BOX_ID+' .nr-row{display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border:1px solid #c8d7de;border-radius:12px;background:#fff;font-size:15px;font-weight:800;line-height:1.4}',
      '#'+BOX_ID+' .nr-icon{width:22px;flex:0 0 22px;text-align:center;font-weight:950}',
      '#'+BOX_ID+' .nr-help{margin:11px 0 0;font-size:14px;font-weight:750;line-height:1.5;color:#405866}',
      '#'+BOX_ID+' .nr-ref{margin-top:8px;color:#526d7b;font-size:12px;font-weight:800}',
      '#'+BOX_ID+' button{width:100%;min-height:50px;margin-top:12px;border:0;border-radius:13px;padding:11px 14px;background:#073a55;color:#fff;font-size:16px;font-weight:900}',
      '#'+BOX_ID+' button:disabled{opacity:.55}',
      '@media(max-width:650px){#'+BOX_ID+'{padding:13px}#'+BOX_ID+' .nr-row{font-size:14px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureBox() {
    var existing = document.getElementById(BOX_ID);
    if (existing) return existing;
    var offer = document.getElementById('notificationOffer');
    if (!offer) return null;
    addStyle();
    var box = document.createElement('div');
    box.id = BOX_ID;
    box.setAttribute('aria-live', 'polite');
    box.innerHTML =
      '<strong class="nr-title">Verificando se este aparelho está pronto para receber avisos…</strong>' +
      '<div class="nr-list"></div>' +
      '<p class="nr-help"></p>' +
      '<p class="nr-ref" hidden></p>' +
      '<button type="button" id="'+VERIFY_ID+'">Verificar novamente</button>';
    var help = document.getElementById('notificationHelp');
    if (help && help.parentNode === offer) help.insertAdjacentElement('afterend', box);
    else offer.appendChild(box);
    var verify = document.getElementById(VERIFY_ID);
    if (verify) verify.addEventListener('click', verifyNow);
    return box;
  }

  function localPermission(OneSignal) {
    var browser = 'default';
    try {
      if (typeof Notification !== 'undefined') browser = text(Notification.permission || 'default').toLowerCase();
    } catch (error) {}
    var oneSignalPermission = false;
    try {
      oneSignalPermission = Boolean(OneSignal && OneSignal.Notifications && OneSignal.Notifications.permission === true);
    } catch (error2) {}
    return {
      browser: browser,
      allowed: oneSignalPermission || browser === 'granted',
      denied: browser === 'denied'
    };
  }

  function snapshot(OneSignal) {
    var permission = localPermission(OneSignal);
    var push = null;
    var tags = {};
    try { push = OneSignal && OneSignal.User && OneSignal.User.PushSubscription; } catch (error) {}
    try {
      if (OneSignal && OneSignal.User && typeof OneSignal.User.getTags === 'function') tags = OneSignal.User.getTags() || {};
    } catch (error2) {}
    var subscriptionId = text(push && push.id).toLowerCase();
    var token = text(push && push.token);
    var optedIn = Boolean(push && push.optedIn === true);
    var currentArea = areaId();
    var subscriptionOk = permission.allowed && optedIn && uuid(subscriptionId) && Boolean(token);
    var areaOk = text(tags.area_tacs).toUpperCase() === currentArea;
    return {
      permission: permission,
      subscriptionId: subscriptionId,
      token: token,
      optedIn: optedIn,
      subscriptionOk: subscriptionOk,
      area: currentArea,
      areaOk: areaOk,
      ready: permission.allowed && subscriptionOk && areaOk
    };
  }

  function row(icon, label, detail) {
    return '<div class="nr-row"><span class="nr-icon" aria-hidden="true">'+icon+'</span><span><b>'+label+'</b><br>'+detail+'</span></div>';
  }

  function manualSettingsHelp(state) {
    var p = platform();
    if (p.android) {
      return 'Se o Android continuar sem mostrar avisos mesmo com os três itens em verde, abra Configurações → Apps → Portal TACS (ou Chrome) → Notificações → Permitir. O Android não permite que o Portal leia diretamente esse botão do sistema.';
    }
    if (p.ios && p.standalone) {
      return 'Se o iPhone continuar sem mostrar avisos mesmo com os três itens em verde, abra Ajustes → Notificações → Portal TACS e confirme que Permitir Notificações está ligado.';
    }
    if (p.ios) {
      return 'No iPhone, abra o Portal pelo ícone da Tela de Início para ativar e receber notificações.';
    }
    return 'Se os avisos continuarem sem aparecer, confira também a permissão de notificações nas configurações do navegador ou do sistema.';
  }

  function render() {
    var box = ensureBox();
    if (!box) return;
    if (!oneSignalRef) {
      box.querySelector('.nr-title').textContent = 'Preparando a verificação das notificações…';
      return;
    }
    var state = snapshot(oneSignalRef);
    var list = box.querySelector('.nr-list');
    var title = box.querySelector('.nr-title');
    var help = box.querySelector('.nr-help');
    var ref = box.querySelector('.nr-ref');
    var permissionIcon = state.permission.allowed ? '✅' : (state.permission.denied ? '❌' : '⚠️');
    var subscriptionIcon = state.subscriptionOk ? '✅' : (state.permission.allowed ? '⚠️' : '—');
    var areaIcon = state.areaOk ? '✅' : (state.subscriptionOk ? '⚠️' : '—');

    list.innerHTML =
      row(permissionIcon, 'Permissão para avisos', state.permission.allowed ? 'Autorizada neste navegador/aplicativo.' : (state.permission.denied ? 'Bloqueada. É necessário liberar nas configurações do aparelho ou navegador.' : 'Ainda não foi autorizada. Toque em “Ativar avisos neste aparelho” e escolha Permitir.')) +
      row(subscriptionIcon, 'Inscrição deste aparelho', state.subscriptionOk ? 'Registrada e com canal Push ativo.' : (state.permission.allowed ? 'Ainda não ficou pronta. Use o botão de ativar/reparar acima.' : 'Será criada depois que a permissão for autorizada.')) +
      row(areaIcon, 'Área do Portal', state.areaOk ? 'Vinculada corretamente a '+areaName()+'.' : (state.subscriptionOk ? 'Ainda precisa confirmar o vínculo com '+areaName()+'.' : 'Será confirmada depois que a inscrição deste aparelho estiver pronta.'));

    box.dataset.ready = state.ready ? '1' : '0';
    box.dataset.blocked = state.permission.denied ? '1' : '0';
    if (state.ready) {
      title.textContent = '✅ Notificações prontas neste aparelho';
      help.textContent = manualSettingsHelp(state);
    } else if (state.permission.denied) {
      title.textContent = '❌ Notificações bloqueadas neste aparelho';
      help.textContent = manualSettingsHelp(state);
    } else if (!state.permission.allowed) {
      title.textContent = '⚠️ Falta autorizar as notificações';
      help.textContent = 'Toque em “Ativar avisos neste aparelho” e aceite a janela oficial de permissão. Depois toque em “Verificar novamente”.';
    } else if (!state.subscriptionOk) {
      title.textContent = '⚠️ A permissão está ativa, mas o aparelho ainda não foi registrado';
      help.textContent = 'Toque em “Reparar recebimento de avisos” ou no botão de ativação acima. O Portal verificará novamente sem alterar seu cadastro de morador.';
    } else {
      title.textContent = '⚠️ O aparelho está registrado, mas falta confirmar a área';
      help.textContent = 'Toque em “Verificar novamente”. O Portal tentará confirmar somente o vínculo da área de notificações.';
    }

    if (ref) {
      if (uuid(state.subscriptionId)) {
        ref.hidden = false;
        ref.textContent = 'Referência técnica deste aparelho: …' + state.subscriptionId.slice(-6).toUpperCase();
      } else {
        ref.hidden = true;
        ref.textContent = '';
      }
    }
  }

  function scheduleRender(delay) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, Number(delay || 120));
  }

  async function verifyNow() {
    var button = document.getElementById(VERIFY_ID);
    if (button) {
      button.disabled = true;
      button.textContent = 'Verificando…';
    }
    try {
      if (oneSignalRef) {
        var state = snapshot(oneSignalRef);
        if (state.subscriptionOk && !state.areaOk && typeof window.PortalTacsMarcarAreaNotificacao === 'function') {
          try { await window.PortalTacsMarcarAreaNotificacao(state.area); } catch (error) {}
        }
      }
      scheduleRender(80);
    } finally {
      setTimeout(function () {
        var current = document.getElementById(VERIFY_ID);
        if (current) {
          current.disabled = false;
          current.textContent = 'Verificar novamente';
        }
        render();
      }, 500);
    }
  }

  function attachOneSignal(OneSignal) {
    oneSignalRef = OneSignal;
    var push = null;
    try { push = OneSignal && OneSignal.User && OneSignal.User.PushSubscription; } catch (error) {}
    if (push && typeof push.addEventListener === 'function') {
      push.addEventListener('change', function () { scheduleRender(120); });
    }
    try {
      if (OneSignal.Notifications && typeof OneSignal.Notifications.addEventListener === 'function') {
        OneSignal.Notifications.addEventListener('permissionChange', function () { scheduleRender(120); });
      }
    } catch (error2) {}
    scheduleRender(250);
  }

  function install() {
    ensureBox();
    var status = document.getElementById('notificationStatus');
    if (status && status.dataset.notificationReadinessObserver !== '1') {
      status.dataset.notificationReadinessObserver = '1';
      new MutationObserver(function () { scheduleRender(100); }).observe(status, { childList: true, characterData: true, subtree: true });
    }
    document.addEventListener('tacs:morador', function () { scheduleRender(150); });
    document.addEventListener('tacs:notificacao-reparo-concluido', function () { scheduleRender(180); });

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      setTimeout(function () { attachOneSignal(OneSignal); }, 350);
    });

    var observer = new MutationObserver(function () {
      if (ensureBox()) scheduleRender(80);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); ensureBox(); scheduleRender(100); }, 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
}());
