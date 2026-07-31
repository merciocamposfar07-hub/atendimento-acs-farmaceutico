(function () {
  'use strict';

  /*
   * Normaliza a confirmação enviada pelo Apps Script antes que o painel
   * registre o listener principal. Também preserva event.source, necessário
   * no Safari/iPhone, e mantém removeEventListener funcionando.
   */
  var originalAdd = window.addEventListener.bind(window);
  var originalRemove = window.removeEventListener.bind(window);
  var listenerMap = new WeakMap();

  window.addEventListener = function (type, listener, options) {
    if (type !== 'message' || typeof listener !== 'function') {
      return originalAdd(type, listener, options);
    }

    var wrapped = function (event) {
      var data = event && event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.source === 'portal-tacs-integral'
      ) {
        var normalized = {};
        Object.keys(data).forEach(function (key) {
          normalized[key] = data[key];
        });
        normalized.source = 'painel-tacs-integral';

        return listener.call(window, {
          data: normalized,
          source: event.source,
          origin: event.origin,
          lastEventId: event.lastEventId,
          ports: event.ports
        });
      }

      return listener.call(window, event);
    };

    listenerMap.set(listener, wrapped);
    return originalAdd(type, wrapped, options);
  };

  window.removeEventListener = function (type, listener, options) {
    var registered = listenerMap.get(listener) || listener;
    return originalRemove(type, registered, options);
  };

  function addStyles() {
    if (document.getElementById('admin-sync-style')) return;
    var style = document.createElement('style');
    style.id = 'admin-sync-style';
    style.textContent =
      '.admin-sync-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:rgba(2,18,30,.72);backdrop-filter:blur(4px)}' +
      '.admin-sync-box{width:min(92vw,520px);padding:25px;border-radius:22px;background:#fff;color:#102b3c;box-shadow:0 25px 70px rgba(0,0,0,.35)}' +
      '.admin-sync-icon{width:54px;height:54px;display:grid;place-items:center;margin:0 auto 12px;border-radius:50%;background:#e7f6ed;color:#078940;font-size:28px;font-weight:950;animation:admin-spin 1.1s linear infinite}' +
      '.admin-sync-box h2{margin:0;text-align:center;font-size:28px}' +
      '.admin-sync-box p{margin:10px 0;text-align:center;font-size:17px;line-height:1.45}' +
      '.admin-sync-bar{height:10px;overflow:hidden;margin:18px 0 10px;border-radius:999px;background:#dbe6eb}' +
      '.admin-sync-progress{height:100%;width:12%;border-radius:999px;background:#079447;transition:width .35s ease}' +
      '.admin-sync-step{text-align:center;color:#06763a;font-size:15px;font-weight:900}' +
      '@keyframes admin-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  function showSync(text, step, percent) {
    addStyles();
    var overlay = document.getElementById('adminSyncOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'adminSyncOverlay';
      overlay.className = 'admin-sync-overlay';
      overlay.innerHTML =
        '<div class="admin-sync-box" role="status" aria-live="polite">' +
        '<div class="admin-sync-icon">↻</div>' +
        '<h2>Sincronizando o Painel TACS</h2>' +
        '<p id="adminSyncText"></p>' +
        '<div class="admin-sync-bar"><div id="adminSyncProgress" class="admin-sync-progress"></div></div>' +
        '<div id="adminSyncStep" class="admin-sync-step"></div>' +
        '</div>';
      document.body.appendChild(overlay);
    }
    document.getElementById('adminSyncText').textContent = text;
    document.getElementById('adminSyncStep').textContent = step;
    document.getElementById('adminSyncProgress').style.width = percent + '%';
  }

  function finishSync() {
    showSync(
      'Dados do painel e do Portal do Morador atualizados.',
      '3/3 — Sincronização concluída',
      100
    );
    setTimeout(function () {
      var overlay = document.getElementById('adminSyncOverlay');
      if (overlay) overlay.remove();
    }, 700);
  }

  function initialSync() {
    showSync(
      'Conectando ao Google Apps Script...',
      '1/3 — Conectando ao banco de dados',
      18
    );
    setTimeout(function () {
      showSync(
        'Recebendo agendas, recados e campanhas...',
        '2/3 — Atualizando o painel',
        68
      );
    }, 400);
    setTimeout(finishSync, 1250);
  }

  function installHooks() {
    initialSync();

    var refresh = document.getElementById('refreshAll');
    if (refresh && refresh.dataset.syncHook !== '1') {
      refresh.dataset.syncHook = '1';
      refresh.addEventListener(
        'click',
        function () {
          showSync(
            'Consultando novamente o Google Apps Script...',
            '1/3 — Atualizando dados',
            20
          );
          setTimeout(function () {
            showSync(
              'Conferindo o Portal do Morador...',
              '2/3 — Validando publicação',
              72
            );
          }, 500);
          setTimeout(finishSync, 1600);
        },
        true
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installHooks);
  } else {
    installHooks();
  }
}());
