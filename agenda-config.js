/*
 * Serviços externos gratuitos usados pelo portal.
 *
 * A agenda odontológica já está ativa no Google Apps Script.
 * O mural de avisos ficará oculto enquanto POSTO_MATIAS_AVISOS_API_URL estiver vazio.
 */
window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/AKfycbzB8HKs_sawD2X8K9O3hGjgCge3gao5S9FjajcqYxyO8e_0WTkrsoqjtBhC4kFhAFTl/exec';
window.POSTO_MATIAS_AVISOS_API_URL = '';

(function () {
  'use strict';

  var base = new URL('.', window.location.href);

  function addLink(rel, href, extra) {
    var link = document.createElement('link');
    link.rel = rel;
    link.href = new URL(href, base).href;
    if (extra) Object.keys(extra).forEach(function (key) { link.setAttribute(key, extra[key]); });
    document.head.appendChild(link);
  }

  addLink('manifest', 'manifest.webmanifest');
  addLink('icon', 'icon-tacs.svg', { type: 'image/svg+xml' });
  addLink('apple-touch-icon', 'icon-tacs.svg');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('service-worker.js', base).href, { scope: base.pathname })
        .catch(function (error) { console.warn('Modo offline não pôde ser ativado:', error); });
    });
  }

  function installOfflineBanner() {
    var style = document.createElement('style');
    style.textContent = '.offline-tacs{position:sticky;top:0;z-index:10000;padding:13px 16px;background:#a85b00;color:#fff;text-align:center;font:800 16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.22)}';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'offline-tacs';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.textContent = 'Sem internet: o portal pode ser preenchido, mas o envio pelo WhatsApp e as atualizações da agenda só funcionarão quando a conexão voltar.';
    document.body.insertBefore(banner, document.body.firstChild);

    function updateConnection() {
      banner.hidden = navigator.onLine;
    }

    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    updateConnection();
  }

  function installFormPersistence() {
    var storageKey = 'tacs-posto-matias-formulario-v1';
    var fieldIds = ['category', 'implanonChoice', 'name', 'birth', 'cpf', 'locality', 'subject'];

    function fieldsReady() {
      return fieldIds.some(function (id) { return document.getElementById(id); });
    }

    function save() {
      var data = {};
      fieldIds.forEach(function (id) {
        var field = document.getElementById(id);
        if (field) data[id] = field.value;
      });
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
    }

    function restore() {
      var raw;
      try { raw = localStorage.getItem(storageKey); } catch (e) { return; }
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        fieldIds.forEach(function (id) {
          var field = document.getElementById(id);
          if (field && typeof data[id] === 'string' && !field.value) {
            field.value = data[id];
            field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
          }
        });
      } catch (e) {}
    }

    function bind() {
      if (!fieldsReady()) return;
      restore();
      fieldIds.forEach(function (id) {
        var field = document.getElementById(id);
        if (!field) return;
        field.addEventListener('input', save);
        field.addEventListener('change', save);
      });
      var send = document.getElementById('send');
      if (send) send.addEventListener('click', save);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      installOfflineBanner();
      installFormPersistence();
    });
  } else {
    installOfflineBanner();
    installFormPersistence();
  }
}());
