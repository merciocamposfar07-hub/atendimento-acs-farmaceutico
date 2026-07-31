(function () {
  'use strict';

  var PIN_HASH_KEY = 'tacs-admin-pin-hash-v3';
  var PIN_SALT_KEY = 'tacs-admin-pin-salt-v3';
  var SERVER_KEY = 'tacs-admin-key';
  var MANAGED_SERVER_KEY = 'tacs-admin-key-gerenciada-pelo-pin-v3';
  var EDITOR_URL = 'geral-admin.html?v=20260731-74';
  var currentMode = 'login';

  function byId(id) {
    return document.getElementById(id);
  }

  function read(storage, key) {
    try {
      return storage.getItem(key) || '';
    } catch (error) {
      return '';
    }
  }

  function write(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (error) {}
  }

  function remove(storage, key) {
    try {
      storage.removeItem(key);
    } catch (error) {}
  }

  function hasCreatedPin() {
    return Boolean(read(localStorage, PIN_HASH_KEY) && read(localStorage, PIN_SALT_KEY));
  }

  function randomSalt() {
    var bytes = new Uint8Array(18);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.prototype.map.call(bytes, function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }

  function fallbackHash(value) {
    var h1 = 0xdeadbeef ^ value.length;
    var h2 = 0x41c6ce57 ^ value.length;
    for (var i = 0; i < value.length; i += 1) {
      var code = value.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return Promise.resolve(
      (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
    );
  }

  function hashPin(pin, salt) {
    var value = 'Portal-TACS|' + salt + '|' + pin;
    if (
      window.crypto &&
      window.crypto.subtle &&
      window.TextEncoder
    ) {
      return window.crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(value))
        .then(function (buffer) {
          return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
            return byte.toString(16).padStart(2, '0');
          }).join('');
        });
    }
    return fallbackHash(value);
  }

  function installStyles() {
    if (byId('portal-unificado-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-unificado-style';
    style.textContent = [
      '.portal-admin-entry{display:block;width:calc(100% - 32px);max-width:720px;margin:20px auto 10px;padding:15px 18px;border:1px solid rgba(255,255,255,.4);border-radius:14px;background:rgba(255,255,255,.1);color:#fff;font-size:16px;font-weight:900;text-align:center}',
      '.portal-admin-modal{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:18px;background:rgba(2,18,30,.86);backdrop-filter:blur(8px)}',
      '.portal-admin-modal[hidden]{display:none!important}',
      '.portal-admin-login{width:min(94vw,470px);max-height:min(92dvh,720px);overflow:auto;padding:25px;border-radius:24px;background:#fff;color:#102b3c;box-shadow:0 30px 90px rgba(0,0,0,.45)}',
      '.portal-admin-login h2{margin:0 0 8px;font-size:28px;line-height:1.15}',
      '.portal-admin-login p{margin:0 0 18px;color:#49616e;font-size:16px;line-height:1.5}',
      '.portal-admin-login label{display:block;margin:13px 0 7px;font-size:16px;font-weight:900}',
      '.portal-admin-login input[type="password"]{width:100%;box-sizing:border-box;padding:15px;border:2px solid #88a4b2;border-radius:14px;font-size:24px;font-weight:900;letter-spacing:.18em;text-align:center}',
      '.portal-admin-login-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}',
      '.portal-admin-login-actions button{min-height:52px;border:0;border-radius:13px;font-size:17px;font-weight:950}',
      '.portal-admin-enter{background:#062c46;color:#fff}',
      '.portal-admin-cancel{background:#e8eff2;color:#173245}',
      '.portal-admin-error{min-height:22px;margin-top:10px;color:#a3312b;font-size:14px;font-weight:850}',
      '.portal-admin-security{margin:15px 0 0;padding:12px 14px;border-radius:12px;background:#edf6fa;color:#274a5c;font-size:14px;font-weight:750;line-height:1.45}',
      '.portal-admin-workspace{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;width:100%;height:100vh;height:100dvh;min-height:0;background:#eaf1f5}',
      '.portal-admin-workspace[hidden]{display:none!important}',
      '.portal-admin-toolbar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:70px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;background:#062c46;color:#fff;box-sizing:border-box}',
      '.portal-admin-toolbar strong{font-size:16px;line-height:1.2}',
      '.portal-admin-toolbar-actions{display:flex;gap:8px}',
      '.portal-admin-toolbar button{min-height:44px;padding:8px 12px;border:1px solid rgba(255,255,255,.48);border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font-size:14px;font-weight:900}',
      '.portal-admin-frame{display:block;flex:1 1 auto;width:100%;height:auto!important;min-height:0;border:0;background:#eaf1f5}',
      'html.portal-admin-open,body.portal-admin-open{overflow:hidden!important;overscroll-behavior:none}',
      '@media(max-width:520px){.portal-admin-toolbar{align-items:flex-start}.portal-admin-toolbar strong{max-width:38%;font-size:14px}.portal-admin-toolbar-actions{flex:1;justify-content:flex-end}.portal-admin-toolbar button{padding:7px 9px;font-size:12px}.portal-admin-login-actions{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function configureModal() {
    var creating = !hasCreatedPin();
    currentMode = creating ? 'create' : 'login';
    byId('portalAdminLoginTitle').textContent = creating
      ? 'Crie seu PIN administrativo'
      : 'Digite seu PIN administrativo';
    byId('portalAdminLoginText').textContent = creating
      ? 'Este PIN será criado por você e será exigido para abrir os controles de edição deste aparelho.'
      : 'Somente após o PIN correto os controles de edição serão abertos.';
    byId('portalAdminConfirmWrap').hidden = !creating;
    byId('portalAdminEnter').textContent = creating
      ? 'Criar PIN e entrar'
      : 'Entrar no modo de edição';
    byId('portalAdminPin').value = '';
    byId('portalAdminPinConfirm').value = '';
    byId('portalAdminError').textContent = '';
  }

  function showPinModal() {
    configureModal();
    byId('portalAdminModal').hidden = false;
    setTimeout(function () {
      byId('portalAdminPin').focus();
    }, 60);
  }

  function hidePinModal() {
    byId('portalAdminModal').hidden = true;
    byId('portalAdminError').textContent = '';
  }

  function syncWorkspaceHeight() {
    var workspace = byId('portalAdminWorkspace');
    if (!workspace || workspace.hidden) return;
    var height = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    workspace.style.height = Math.max(320, Math.round(height)) + 'px';
  }

  function openWorkspace() {
    var workspace = byId('portalAdminWorkspace');
    var frame = byId('portalAdminFrame');
    if (!workspace || !frame) return;
    document.documentElement.classList.add('portal-admin-open');
    document.body.classList.add('portal-admin-open');
    workspace.hidden = false;
    syncWorkspaceHeight();
    frame.src = EDITOR_URL + '&t=' + Date.now();
  }

  function closeWorkspace() {
    var workspace = byId('portalAdminWorkspace');
    if (workspace) workspace.hidden = true;
    document.documentElement.classList.remove('portal-admin-open');
    document.body.classList.remove('portal-admin-open');
    if (typeof window.portalTacsSincronizar === 'function') {
      setTimeout(window.portalTacsSincronizar, 120);
    }
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
      '<h2 id="portalAdminLoginTitle">PIN administrativo</h2>' +
      '<p id="portalAdminLoginText"></p>' +
      '<label for="portalAdminPin">PIN numérico</label>' +
      '<input id="portalAdminPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="4 a 8 números">' +
      '<div id="portalAdminConfirmWrap">' +
      '<label for="portalAdminPinConfirm">Confirme o PIN</label>' +
      '<input id="portalAdminPinConfirm" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="Digite novamente">' +
      '</div>' +
      '<div class="portal-admin-security">O PIN não será mostrado aos moradores. A gravação continuará dependendo da autorização do servidor.</div>' +
      '<div id="portalAdminError" class="portal-admin-error"></div>' +
      '<div class="portal-admin-login-actions">' +
      '<button id="portalAdminEnter" class="portal-admin-enter" type="submit">Entrar</button>' +
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
      '<button id="portalAdminChangePin" type="button">Trocar PIN</button>' +
      '</div></header>' +
      '<iframe id="portalAdminFrame" class="portal-admin-frame" title="Edição do Portal TACS"></iframe>';
    document.body.appendChild(workspace);

    entry.addEventListener('click', showPinModal);
    byId('portalAdminCancel').addEventListener('click', hidePinModal);
    byId('portalAdminClose').addEventListener('click', closeWorkspace);
    byId('portalAdminChangePin').addEventListener('click', function () {
      closeWorkspace();
      remove(localStorage, PIN_HASH_KEY);
      remove(localStorage, PIN_SALT_KEY);
      if (read(localStorage, MANAGED_SERVER_KEY) === '1') {
        remove(localStorage, SERVER_KEY);
        remove(sessionStorage, SERVER_KEY);
        remove(localStorage, MANAGED_SERVER_KEY);
      }
      showPinModal();
    });

    byId('portalAdminLogin').addEventListener('submit', function (event) {
      event.preventDefault();
      var pin = String(byId('portalAdminPin').value || '').trim();
      var confirm = String(byId('portalAdminPinConfirm').value || '').trim();
      var error = byId('portalAdminError');

      if (!/^\d{4,8}$/.test(pin)) {
        error.textContent = 'Crie um PIN numérico com 4 a 8 números.';
        return;
      }

      if (currentMode === 'create' && pin !== confirm) {
        error.textContent = 'Os dois campos de PIN não coincidem.';
        return;
      }

      error.textContent = 'Verificando...';

      if (currentMode === 'create') {
        var salt = randomSalt();
        hashPin(pin, salt).then(function (hash) {
          write(localStorage, PIN_SALT_KEY, salt);
          write(localStorage, PIN_HASH_KEY, hash);

          var existingServerKey =
            read(sessionStorage, SERVER_KEY) ||
            read(localStorage, SERVER_KEY);
          if (!existingServerKey) {
            write(localStorage, SERVER_KEY, pin);
            write(localStorage, MANAGED_SERVER_KEY, '1');
          }
          write(sessionStorage, SERVER_KEY, existingServerKey || pin);

          hidePinModal();
          openWorkspace();
        }).catch(function () {
          error.textContent = 'Não foi possível criar o PIN neste aparelho.';
        });
        return;
      }

      var saltSaved = read(localStorage, PIN_SALT_KEY);
      var hashSaved = read(localStorage, PIN_HASH_KEY);
      hashPin(pin, saltSaved).then(function (hash) {
        if (hash !== hashSaved) {
          error.textContent = 'PIN incorreto.';
          return;
        }
        if (read(localStorage, MANAGED_SERVER_KEY) === '1') {
          write(sessionStorage, SERVER_KEY, pin);
        }
        hidePinModal();
        openWorkspace();
      }).catch(function () {
        error.textContent = 'Não foi possível verificar o PIN.';
      });
    });

    window.addEventListener('resize', syncWorkspaceHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncWorkspaceHeight);
      window.visualViewport.addEventListener('scroll', syncWorkspaceHeight);
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
