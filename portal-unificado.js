(function () {
  'use strict';

  var STORAGE_KEY = 'tacs-admin-key';
  var EDITOR_URL = 'geral-admin.html?v=20260731-70';

  function byId(id) {
    return document.getElementById(id);
  }

  function installStyles() {
    if (byId('portal-unificado-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-unificado-style';
    style.textContent = [
      '.portal-admin-entry{display:block;width:calc(100% - 32px);max-width:720px;margin:20px auto 10px;padding:14px 18px;border:1px solid rgba(255,255,255,.35);border-radius:14px;background:rgba(255,255,255,.08);color:#fff;font-size:15px;font-weight:850;text-align:center}',
      '.portal-admin-entry:active{transform:scale(.99)}',
      '.portal-admin-modal{position:fixed;inset:0;z-index:200000;display:grid;place-items:center;padding:18px;background:rgba(2,18,30,.82);backdrop-filter:blur(7px)}',
      '.portal-admin-modal[hidden]{display:none!important}',
      '.portal-admin-login{width:min(94vw,460px);padding:25px;border-radius:24px;background:#fff;color:#102b3c;box-shadow:0 30px 90px rgba(0,0,0,.42)}',
      '.portal-admin-login h2{margin:0 0 8px;font-size:28px}',
      '.portal-admin-login p{margin:0 0 18px;color:#49616e;font-size:16px;line-height:1.5}',
      '.portal-admin-login label{display:block;margin:13px 0 7px;font-size:16px;font-weight:900}',
      '.portal-admin-login input[type="password"]{width:100%;box-sizing:border-box;padding:15px;border:2px solid #88a4b2;border-radius:14px;font-size:24px;font-weight:900;letter-spacing:.18em;text-align:center}',
      '.portal-admin-remember{display:flex!important;align-items:flex-start;gap:9px;margin:13px 0!important;font-size:14px!important;font-weight:700!important;color:#415966}',
      '.portal-admin-login-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}',
      '.portal-admin-login-actions button{min-height:52px;border:0;border-radius:13px;font-size:17px;font-weight:950}',
      '.portal-admin-enter{background:#062c46;color:#fff}',
      '.portal-admin-cancel{background:#e8eff2;color:#173245}',
      '.portal-admin-error{min-height:22px;margin-top:10px;color:#a3312b;font-size:14px;font-weight:850}',
      '.portal-admin-workspace{position:fixed;inset:0;z-index:199999;background:#eaf1f5}',
      '.portal-admin-workspace[hidden]{display:none!important}',
      '.portal-admin-toolbar{height:64px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:#062c46;color:#fff;box-sizing:border-box;padding-top:max(8px,env(safe-area-inset-top))}',
      '.portal-admin-toolbar strong{font-size:16px;line-height:1.2}',
      '.portal-admin-toolbar-actions{display:flex;gap:8px}',
      '.portal-admin-toolbar button{min-height:42px;padding:8px 13px;border:1px solid rgba(255,255,255,.45);border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font-size:14px;font-weight:900}',
      '.portal-admin-frame{display:block;width:100%;height:calc(100% - 64px);border:0;background:#eaf1f5}',
      'body.portal-admin-open{overflow:hidden!important}',
      '@media(max-width:480px){.portal-admin-toolbar strong{max-width:44%;font-size:14px}.portal-admin-toolbar button{padding:7px 9px;font-size:13px}.portal-admin-login-actions{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function readPin() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function savePin(pin, remember) {
    try {
      sessionStorage.setItem(STORAGE_KEY, pin);
      if (remember) localStorage.setItem(STORAGE_KEY, pin);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {}
  }

  function clearPin() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {}
  }

  function createInterface() {
    if (byId('portalAdminEntry')) return;

    var footer = document.querySelector('footer');
    var entry = document.createElement('button');
    entry.id = 'portalAdminEntry';
    entry.type = 'button';
    entry.className = 'portal-admin-entry';
    entry.textContent = '🔒 Área do administrador';

    if (footer) footer.appendChild(entry);
    else document.body.appendChild(entry);

    var modal = document.createElement('div');
    modal.id = 'portalAdminModal';
    modal.className = 'portal-admin-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<form class="portal-admin-login" id="portalAdminLogin">' +
      '<h2>Área do administrador</h2>' +
      '<p>O morador continua usando o portal normalmente. Os controles de edição só serão liberados após o PIN.</p>' +
      '<label for="portalAdminPin">PIN administrativo</label>' +
      '<input id="portalAdminPin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12" placeholder="••••••">' +
      '<label class="portal-admin-remember"><input id="portalAdminRemember" type="checkbox"> Manter o acesso neste aparelho. Não marque em aparelho compartilhado.</label>' +
      '<div id="portalAdminError" class="portal-admin-error"></div>' +
      '<div class="portal-admin-login-actions">' +
      '<button class="portal-admin-enter" type="submit">Entrar no modo de edição</button>' +
      '<button class="portal-admin-cancel" id="portalAdminCancel" type="button">Cancelar</button>' +
      '</div></form>';
    document.body.appendChild(modal);

    var workspace = document.createElement('div');
    workspace.id = 'portalAdminWorkspace';
    workspace.className = 'portal-admin-workspace';
    workspace.hidden = true;
    workspace.innerHTML =
      '<header class="portal-admin-toolbar">' +
      '<strong>Portal Geral • Modo administrador</strong>' +
      '<div class="portal-admin-toolbar-actions">' +
      '<button id="portalAdminClose" type="button">Voltar ao portal</button>' +
      '<button id="portalAdminLogout" type="button">Sair e apagar PIN</button>' +
      '</div></header>' +
      '<iframe id="portalAdminFrame" class="portal-admin-frame" title="Edição do Portal TACS"></iframe>';
    document.body.appendChild(workspace);

    entry.addEventListener('click', function () {
      var existing = readPin();
      if (existing) {
        openWorkspace();
        return;
      }
      modal.hidden = false;
      setTimeout(function () { byId('portalAdminPin').focus(); }, 50);
    });

    byId('portalAdminCancel').addEventListener('click', function () {
      modal.hidden = true;
      byId('portalAdminError').textContent = '';
      byId('portalAdminPin').value = '';
    });

    byId('portalAdminLogin').addEventListener('submit', function (event) {
      event.preventDefault();
      var pin = String(byId('portalAdminPin').value || '').trim();
      var error = byId('portalAdminError');
      if (!/^\d{4,12}$/.test(pin)) {
        error.textContent = 'Use um PIN numérico com 4 a 12 números.';
        return;
      }
      savePin(pin, byId('portalAdminRemember').checked);
      error.textContent = '';
      modal.hidden = true;
      openWorkspace();
    });

    byId('portalAdminClose').addEventListener('click', closeWorkspace);
    byId('portalAdminLogout').addEventListener('click', function () {
      clearPin();
      closeWorkspace();
      var frame = byId('portalAdminFrame');
      frame.removeAttribute('src');
    });
  }

  function openWorkspace() {
    var workspace = byId('portalAdminWorkspace');
    var frame = byId('portalAdminFrame');
    if (!workspace || !frame) return;
    document.body.classList.add('portal-admin-open');
    workspace.hidden = false;
    if (!frame.getAttribute('src')) {
      frame.src = EDITOR_URL + '&t=' + Date.now();
    }
  }

  function closeWorkspace() {
    var workspace = byId('portalAdminWorkspace');
    if (workspace) workspace.hidden = true;
    document.body.classList.remove('portal-admin-open');
    if (typeof window.portalTacsSincronizar === 'function') {
      setTimeout(window.portalTacsSincronizar, 100);
    }
  }

  function install() {
    installStyles();
    createInterface();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
