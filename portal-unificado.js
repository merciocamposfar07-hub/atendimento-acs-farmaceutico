(function () {
  'use strict';

  var VERSION = '20260731-76';
  var EDITOR_URL = 'geral-admin.html?v=' + VERSION;
  var PIN_HASH_KEY = 'tacs-admin-pin-hash-v3';
  var PIN_SALT_KEY = 'tacs-admin-pin-salt-v3';
  var SERVER_KEY = 'tacs-admin-key';
  var MANAGED_SERVER_KEY = 'tacs-admin-key-gerenciada-pelo-pin-v3';
  var currentMode = 'login';

  function id(value) {
    return document.getElementById(value);
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

  function hasPin() {
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
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
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
    if (id('portal-admin-access-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-admin-access-style';
    style.textContent = [
      '.portal-admin-entry{display:block;width:calc(100% - 32px);max-width:720px;margin:20px auto 10px;padding:15px 18px;border:1px solid rgba(255,255,255,.4);border-radius:14px;background:rgba(255,255,255,.1);color:#fff;font-size:16px;font-weight:900;text-align:center}',
      '.portal-admin-modal{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:18px;background:rgba(2,18,30,.88);backdrop-filter:blur(8px)}',
      '.portal-admin-modal[hidden]{display:none!important}',
      '.portal-admin-login{width:min(94vw,470px);max-height:90dvh;overflow:auto;padding:25px;border-radius:24px;background:#fff;color:#102b3c;box-shadow:0 30px 90px rgba(0,0,0,.45)}',
      '.portal-admin-login h2{margin:0 0 8px;font-size:28px;line-height:1.15}',
      '.portal-admin-login p{margin:0 0 18px;color:#49616e;font-size:16px;line-height:1.5}',
      '.portal-admin-login label{display:block;margin:13px 0 7px;font-size:16px;font-weight:900}',
      '.portal-admin-login input{width:100%;box-sizing:border-box;padding:15px;border:2px solid #88a4b2;border-radius:14px;font-size:24px;font-weight:900;letter-spacing:.18em;text-align:center}',
      '.portal-admin-login-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}',
      '.portal-admin-login-actions button{min-height:52px;border:0;border-radius:13px;font-size:17px;font-weight:950}',
      '.portal-admin-enter{background:#062c46;color:#fff}',
      '.portal-admin-cancel{background:#e8eff2;color:#173245}',
      '.portal-admin-error{min-height:22px;margin-top:10px;color:#a3312b;font-size:14px;font-weight:850}',
      '.portal-admin-security{margin-top:15px;padding:12px 14px;border-radius:12px;background:#edf6fa;color:#274a5c;font-size:14px;font-weight:750;line-height:1.45}',
      '@media(max-width:520px){.portal-admin-login-actions{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function configureModal() {
    var creating = !hasPin();
    currentMode = creating ? 'create' : 'login';
    id('portalAdminLoginTitle').textContent = creating
      ? 'Crie seu PIN administrativo'
      : 'Digite seu PIN administrativo';
    id('portalAdminLoginText').textContent = creating
      ? 'Você cria o PIN agora. Depois, ele será exigido para abrir a edição do portal neste aparelho.'
      : 'Digite o PIN criado anteriormente para abrir a edição do portal.';
    id('portalAdminConfirmWrap').hidden = !creating;
    id('portalAdminEnter').textContent = creating
      ? 'Criar PIN e abrir editor'
      : 'Abrir editor';
    id('portalAdminPin').value = '';
    id('portalAdminPinConfirm').value = '';
    id('portalAdminError').textContent = '';
  }

  function showModal() {
    configureModal();
    id('portalAdminModal').hidden = false;
    setTimeout(function () {
      id('portalAdminPin').focus();
    }, 50);
  }

  function hideModal() {
    id('portalAdminModal').hidden = true;
  }

  function openEditor() {
    window.location.href = EDITOR_URL + '&t=' + Date.now();
  }

  function install() {
    if (id('portalAdminEntry')) return;
    installStyles();

    var footer = document.querySelector('footer');
    var entry = document.createElement('button');
    entry.id = 'portalAdminEntry';
    entry.type = 'button';
    entry.className = 'portal-admin-entry';
    entry.textContent = '🔒 Área do administrador';
    (footer || document.body).appendChild(entry);

    var modal = document.createElement('div');
    modal.id = 'portalAdminModal';
    modal.className = 'portal-admin-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<form id="portalAdminLogin" class="portal-admin-login">' +
      '<h2 id="portalAdminLoginTitle">PIN administrativo</h2>' +
      '<p id="portalAdminLoginText"></p>' +
      '<label for="portalAdminPin">PIN numérico</label>' +
      '<input id="portalAdminPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="4 a 8 números">' +
      '<div id="portalAdminConfirmWrap">' +
      '<label for="portalAdminPinConfirm">Confirme o PIN</label>' +
      '<input id="portalAdminPinConfirm" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="Digite novamente">' +
      '</div>' +
      '<div class="portal-admin-security">A edição será aberta em página própria. Não haverá iframe nem tela sobreposta.</div>' +
      '<div id="portalAdminError" class="portal-admin-error"></div>' +
      '<div class="portal-admin-login-actions">' +
      '<button id="portalAdminEnter" class="portal-admin-enter" type="submit">Abrir editor</button>' +
      '<button id="portalAdminCancel" class="portal-admin-cancel" type="button">Cancelar</button>' +
      '</div></form>';
    document.body.appendChild(modal);

    entry.addEventListener('click', showModal);
    id('portalAdminCancel').addEventListener('click', hideModal);

    id('portalAdminLogin').addEventListener('submit', function (event) {
      event.preventDefault();
      var pin = String(id('portalAdminPin').value || '').trim();
      var confirm = String(id('portalAdminPinConfirm').value || '').trim();
      var error = id('portalAdminError');

      if (!/^\d{4,8}$/.test(pin)) {
        error.textContent = 'Use um PIN numérico de 4 a 8 números.';
        return;
      }

      if (currentMode === 'create' && pin !== confirm) {
        error.textContent = 'Os dois campos não coincidem.';
        return;
      }

      error.textContent = 'Verificando...';

      if (currentMode === 'create') {
        var salt = randomSalt();
        hashPin(pin, salt).then(function (hash) {
          write(localStorage, PIN_SALT_KEY, salt);
          write(localStorage, PIN_HASH_KEY, hash);

          var serverKey =
            read(sessionStorage, SERVER_KEY) ||
            read(localStorage, SERVER_KEY);
          if (!serverKey) {
            write(localStorage, SERVER_KEY, pin);
            write(localStorage, MANAGED_SERVER_KEY, '1');
            serverKey = pin;
          }
          write(sessionStorage, SERVER_KEY, serverKey);
          openEditor();
        }).catch(function () {
          error.textContent = 'Não foi possível criar o PIN neste aparelho.';
        });
        return;
      }

      hashPin(pin, read(localStorage, PIN_SALT_KEY)).then(function (hash) {
        if (hash !== read(localStorage, PIN_HASH_KEY)) {
          error.textContent = 'PIN incorreto.';
          return;
        }
        if (read(localStorage, MANAGED_SERVER_KEY) === '1') {
          write(sessionStorage, SERVER_KEY, pin);
        }
        openEditor();
      }).catch(function () {
        error.textContent = 'Não foi possível verificar o PIN.';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
