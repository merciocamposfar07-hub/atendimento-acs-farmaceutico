(function () {
  'use strict';

  var VERSION = '20260731-75';
  var INDEX_URL = 'index.html?v=' + VERSION;
  var ADMIN_URL = 'geral-admin.html?v=' + VERSION + '&standalone=1';
  var PIN_HASH_KEY = 'tacs-admin-pin-hash-v3';
  var PIN_SALT_KEY = 'tacs-admin-pin-salt-v3';
  var SERVER_KEY = 'tacs-admin-key';
  var MANAGED_SERVER_KEY = 'tacs-admin-key-gerenciada-pelo-pin-v3';

  function isAdminPage() {
    return /geral-admin\.html$/i.test(window.location.pathname);
  }

  function remove(storage, key) {
    try {
      storage.removeItem(key);
    } catch (error) {}
  }

  function installPublicRedirect() {
    function watchWorkspace() {
      var workspace = document.getElementById('portalAdminWorkspace');
      if (!workspace || workspace.dataset.fastRedirect === '1') return false;

      workspace.dataset.fastRedirect = '1';

      function redirectWhenOpened() {
        if (workspace.hidden) return;
        workspace.hidden = true;
        window.location.replace(
          ADMIN_URL + '&t=' + Date.now()
        );
      }

      new MutationObserver(redirectWhenOpened).observe(workspace, {
        attributes: true,
        attributeFilter: ['hidden', 'style', 'class']
      });

      redirectWhenOpened();
      return true;
    }

    if (!watchWorkspace()) {
      var observer = new MutationObserver(function () {
        if (watchWorkspace()) observer.disconnect();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      setTimeout(function () {
        observer.disconnect();
      }, 15000);
    }
  }

  function addAdminStyles() {
    if (document.getElementById('portal-admin-fast-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-admin-fast-style';
    style.textContent = [
      'body{padding-top:calc(72px + env(safe-area-inset-top))!important}',
      '.standalone-admin-bar{position:fixed;left:0;right:0;top:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:72px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;background:#062c46;color:#fff;box-shadow:0 6px 20px rgba(3,35,56,.24)}',
      '.standalone-admin-bar strong{font-size:15px;line-height:1.25}',
      '.standalone-admin-actions{display:flex;gap:8px}',
      '.standalone-admin-bar button{min-height:44px;padding:8px 12px;border:1px solid rgba(255,255,255,.48);border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font-size:13px;font-weight:900}',
      '.admin-fast-note{margin:0 0 14px;padding:11px 13px;border-radius:12px;background:#e7f6ed;color:#075f32;font-size:14px;font-weight:850;line-height:1.45}',
      '@media(max-width:520px){.standalone-admin-bar strong{max-width:34%}.standalone-admin-actions{flex:1;justify-content:flex-end}.standalone-admin-bar button{padding:7px 9px;font-size:12px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function installAdminBar() {
    if (document.getElementById('standaloneAdminBar')) return;

    addAdminStyles();

    var bar = document.createElement('header');
    bar.id = 'standaloneAdminBar';
    bar.className = 'standalone-admin-bar';
    bar.innerHTML =
      '<strong>Portal Geral • Modo administrador</strong>' +
      '<div class="standalone-admin-actions">' +
      '<button id="standaloneBack" type="button">Voltar ao portal</button>' +
      '<button id="standalonePin" type="button">Trocar PIN</button>' +
      '</div>';
    document.body.appendChild(bar);

    document.getElementById('standaloneBack').addEventListener('click', function () {
      window.location.replace(INDEX_URL + '&t=' + Date.now());
    });

    document.getElementById('standalonePin').addEventListener('click', function () {
      remove(localStorage, PIN_HASH_KEY);
      remove(localStorage, PIN_SALT_KEY);
      if (localStorage.getItem(MANAGED_SERVER_KEY) === '1') {
        remove(localStorage, SERVER_KEY);
        remove(sessionStorage, SERVER_KEY);
        remove(localStorage, MANAGED_SERVER_KEY);
      }
      window.location.replace(INDEX_URL + '&trocarPin=1&t=' + Date.now());
    });
  }

  function showImmediateEditor() {
    var main = document.querySelector('.main');
    if (main && !document.getElementById('adminFastNote')) {
      var note = document.createElement('div');
      note.id = 'adminFastNote';
      note.className = 'admin-fast-note';
      note.textContent =
        'Editor aberto. Os dados do servidor estão sendo atualizados em segundo plano.';
      main.insertBefore(note, main.firstChild);
    }

    var refresh = document.getElementById('refreshAll');
    if (refresh) {
      var restore = function () {
        if (/conferindo|carregando|servidores/i.test(refresh.textContent || '')) {
          refresh.textContent = '↻ Atualizar dados do servidor';
        }
      };
      restore();
      new MutationObserver(restore).observe(refresh, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  }

  function installAdminPage() {
    installAdminBar();
    showImmediateEditor();

    document.addEventListener('DOMContentLoaded', function () {
      installAdminBar();
      showImmediateEditor();
    });

    setTimeout(showImmediateEditor, 250);
    setTimeout(showImmediateEditor, 1000);
  }

  if (isAdminPage()) {
    installAdminPage();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPublicRedirect);
  } else {
    installPublicRedirect();
  }
}());
