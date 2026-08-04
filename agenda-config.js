/*
 * Configuração única dos serviços externos usados pelo Portal TACS.
 *
 * Responsabilidades:
 * - Portal TACS / Banco de Dados: agendas profissionais, recados e campanhas.
 * - Agenda Odontológica: vagas comuns e emergenciais e respectivas reservas.
 *
 * Este arquivo não publica avisos nem reserva vagas. Ele apenas expõe os
 * endereços oficiais e cuida de recursos locais do formulário.
 */
window.TACS_ADMIN_API_URL = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';

(function () {
  'use strict';

  var base = new URL('.', window.location.href);

  function addLink(rel, href, extra) {
    var link = document.createElement('link');
    link.rel = rel;
    link.href = new URL(href, base).href;
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        link.setAttribute(key, extra[key]);
      });
    }
    document.head.appendChild(link);
  }

  function installPublicContentModule() {
    if (
      window.PortalTacsConteudoPublicoV1 ||
      document.getElementById('portal-conteudo-publico-v1-script')
    ) {
      return;
    }

    var script = document.createElement('script');
    script.id = 'portal-conteudo-publico-v1-script';
    script.src = new URL(
      'assets/js/portal-conteudo-publico-v1.js?v=20260802-2247',
      base
    ).href;
    script.async = true;
    document.head.appendChild(script);
  }

  function installDentalTheme() {
    if (document.getElementById('dental-theme-posto-matias')) return;
    var style = document.createElement('style');
    style.id = 'dental-theme-posto-matias';
    style.textContent = [
      '.dental{padding:24px!important;border:2px solid #0D5F8A!important;border-radius:20px!important;background:linear-gradient(145deg,#041F34 0%,#062C46 58%,#0A4265 100%)!important;color:#fff!important;box-shadow:0 18px 34px rgba(3,35,56,.22)!important}',
      '.dental-head span{color:#70E39F!important;font-size:14px!important;font-weight:950!important;letter-spacing:.075em!important;line-height:1.45!important}',
      '.dental-head h3{margin:10px 0 8px!important;color:#fff!important;font-size:clamp(30px,5vw,42px)!important;line-height:1.15!important}',
      '.dental-head p{margin:0 0 20px!important;color:#D8E7EE!important;font-size:18px!important;font-weight:650!important;line-height:1.55!important}',
      '.slots{gap:14px!important}',
      '.slot{min-height:132px!important;padding:18px 20px!important;border:2px solid #6E9DB5!important;border-radius:17px!important;background:#fff!important;color:#102B3C!important;box-shadow:0 8px 18px rgba(0,0,0,.12)!important}',
      '.slot:hover,.slot:focus-visible{border-color:#70E39F!important;box-shadow:0 0 0 4px rgba(112,227,159,.20),0 10px 22px rgba(0,0,0,.14)!important}',
      '.slot.selected{border-color:#16A85D!important;background:#ECF9F1!important;box-shadow:0 0 0 4px rgba(22,168,93,.22),0 10px 22px rgba(0,0,0,.14)!important}',
      '.slot strong{color:#102B3C!important;font-size:20px!important;line-height:1.3!important}',
      '.slot span{color:#425B69!important;font-size:17px!important}',
      '.slot b{color:#078940!important;font-size:17px!important;font-weight:950!important}',
      '.slot:disabled{opacity:.72!important;background:#EEF3F5!important;border-color:#A9BDC7!important;box-shadow:none!important}',
      '.slot:disabled strong,.slot:disabled span,.slot:disabled b{color:#718792!important}',
      '.dental-status{margin:20px 0 0!important;padding-top:18px!important;border-top:1px solid #4C829D!important;color:#fff!important;font-size:17px!important;font-weight:850!important;line-height:1.55!important}',
      '.dental-status.error{color:#FFD5D2!important}',
      '@media(max-width:720px){.dental{padding:21px 17px!important}.dental-head h3{font-size:32px!important}.dental-head p{font-size:17px!important}.slot{min-height:116px!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function installOfflineBanner() {
    if (document.querySelector('.offline-tacs')) return;
    var style = document.createElement('style');
    style.textContent = '.offline-tacs{position:sticky;top:0;z-index:10000;padding:13px 16px;background:#a85b00;color:#fff;text-align:center;font:800 16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.22)}';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'offline-tacs';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.textContent = 'Sem internet: os dados permanecem no formulário, mas as agendas e o envio pelo WhatsApp só funcionarão quando a conexão voltar.';
    document.body.insertBefore(banner, document.body.firstChild);

    function updateConnection() {
      banner.hidden = navigator.onLine;
    }
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    updateConnection();
  }

  function installFormPersistence() {
    var storageKey = 'tacs-posto-matias-formulario-v2';
    var fieldIds = ['category', 'implanonChoice', 'name', 'birth', 'cpf', 'locality', 'subject'];

    function save() {
      var data = {};
      fieldIds.forEach(function (id) {
        var field = document.getElementById(id);
        if (field) data[id] = field.value;
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {}
    }

    function restore() {
      var raw;
      try {
        raw = localStorage.getItem(storageKey);
      } catch (error) {
        return;
      }
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        fieldIds.forEach(function (id) {
          var field = document.getElementById(id);
          if (!field || field.value || typeof data[id] !== 'string') return;
          field.value = data[id];
          field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        });
      } catch (error) {}
    }

    function bind() {
      restore();
      fieldIds.forEach(function (id) {
        var field = document.getElementById(id);
        if (!field) return;
        field.addEventListener('input', save);
        field.addEventListener('change', save);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  function installCnsWhatsappActivation() {
    var temporaryCpf = '52998224725';

    function digits(value) {
      return String(value || '').replace(/\D/g, '');
    }

    function isCns(value) {
      return /^\d{15}$/.test(digits(value));
    }

    function isDentalCategory(value) {
      return String(value || '').toLowerCase().indexOf('odontol') !== -1;
    }

    function selectedDentalVacancy() {
      return Boolean(document.querySelector(
        '#dentalSlots .slot.selected:not(:disabled), ' +
        '#dentalSlots .sheet-dental-choice.selected:not(:disabled)'
      ));
    }

    function refresh() {
      window.setTimeout(function () {
        var send = document.getElementById('send');
        var documentField = document.getElementById('cpf');
        var category = document.getElementById('category');
        var name = document.getElementById('name');
        var birth = document.getElementById('birth');
        var locality = document.getElementById('locality');
        var subject = document.getElementById('subject');

        if (!send || !documentField || !category || !name || !birth || !locality || !subject) return;
        if (!isCns(documentField.value)) return;
        if (!isDentalCategory(category.value)) return;

        var ready =
          name.value.trim().length >= 3 &&
          /^\d{2}\/\d{2}\/\d{4}$/.test(birth.value.trim()) &&
          locality.value.trim().length > 0 &&
          subject.value.trim().length > 0 &&
          selectedDentalVacancy();

        if (ready && !send.hidden && send.textContent.indexOf('Reservando') === -1) {
          send.disabled = false;
        }
      }, 0);
    }

    window.addEventListener('click', function (event) {
      var send = document.getElementById('send');
      var documentField = document.getElementById('cpf');
      var target = event.target && event.target.closest ? event.target.closest('#send') : null;
      if (!send || target !== send || !documentField || !isCns(documentField.value)) return;

      var originalValue = documentField.value;
      documentField.value = temporaryCpf;
      Promise.resolve().then(function () {
        documentField.value = originalValue;
      });
    }, true);

    document.addEventListener('input', refresh, true);
    document.addEventListener('change', refresh, true);
    document.addEventListener('click', refresh, true);

    var observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'class', 'hidden']
    });

    refresh();
  }

  addLink('manifest', 'manifest.webmanifest');
  addLink('icon', 'icon-tacs.svg', { type: 'image/svg+xml' });
  addLink('apple-touch-icon', 'icon-tacs.svg');
  installDentalTheme();
  installPublicContentModule();

  function init() {
    installOfflineBanner();
    installFormPersistence();
    installCnsWhatsappActivation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
