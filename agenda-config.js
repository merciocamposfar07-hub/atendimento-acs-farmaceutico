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

  function installDentalReservationReturnReset() {
    var storageKey = 'tacs-reserva-odontologica-concluida-v1';

    function hasCompletedReservation() {
      try {
        return sessionStorage.getItem(storageKey) === '1';
      } catch (error) {
        return false;
      }
    }

    function clearCompletedReservation() {
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {}
    }

    function markCompletedReservation(event) {
      var data = event && event.data;
      if (
        !data ||
        data.source !== 'agenda-odontologica-tacs' ||
        data.ok !== true ||
        !data.requestId
      ) {
        return;
      }
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (error) {}
    }

    function reloadAfterWhatsAppReturn() {
      if (!hasCompletedReservation()) return;
      clearCompletedReservation();
      window.location.reload();
    }

    window.addEventListener('message', markCompletedReservation);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) reloadAfterWhatsAppReturn();
    });
    window.addEventListener('pageshow', function (event) {
      if (!hasCompletedReservation()) return;
      if (event.persisted) reloadAfterWhatsAppReturn();
      else clearCompletedReservation();
    });
  }

  function installCpfCnsCompatibility() {
    var field = document.getElementById('cpf');
    var send = document.getElementById('send');
    if (!field || !send || field.dataset.cpfCnsCompat === '1') return;

    field.dataset.cpfCnsCompat = '1';
    field.maxLength = 18;
    field.placeholder = 'CPF ou CNS';

    var label = field.parentElement;
    if (label && label.firstChild && label.firstChild.nodeType === 3) {
      label.firstChild.nodeValue = 'CPF ou CNS\n              ';
    }

    var status = document.getElementById('cpfStatus');

    function onlyDigits(value) {
      return String(value == null ? '' : value).replace(/\D/g, '');
    }

    function validCpf(value) {
      var valueDigits = onlyDigits(value);
      if (!/^\d{11}$/.test(valueDigits) || /^(\d)\1{10}$/.test(valueDigits)) return false;
      var sum = 0;
      var index;
      for (index = 0; index < 9; index += 1) sum += Number(valueDigits.charAt(index)) * (10 - index);
      var first = (sum * 10) % 11;
      if (first === 10) first = 0;
      if (first !== Number(valueDigits.charAt(9))) return false;
      sum = 0;
      for (index = 0; index < 10; index += 1) sum += Number(valueDigits.charAt(index)) * (11 - index);
      var second = (sum * 10) % 11;
      if (second === 10) second = 0;
      return second === Number(valueDigits.charAt(10));
    }

    function validCns(value) {
      var valueDigits = onlyDigits(value);
      if (!/^\d{15}$/.test(valueDigits) || /^(\d)\1{14}$/.test(valueDigits)) return false;
      var sum = 0;
      for (var index = 0; index < 15; index += 1) {
        sum += Number(valueDigits.charAt(index)) * (15 - index);
      }
      return sum % 11 === 0;
    }

    function formatCns(value) {
      var valueDigits = onlyDigits(value).slice(0, 15);
      if (valueDigits.length <= 3) return valueDigits;
      if (valueDigits.length <= 7) return valueDigits.slice(0, 3) + ' ' + valueDigits.slice(3);
      if (valueDigits.length <= 11) return valueDigits.slice(0, 3) + ' ' + valueDigits.slice(3, 7) + ' ' + valueDigits.slice(7);
      return valueDigits.slice(0, 3) + ' ' + valueDigits.slice(3, 7) + ' ' + valueDigits.slice(7, 11) + ' ' + valueDigits.slice(11);
    }

    function validBirth(value) {
      var match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return false;
      var day = Number(match[1]);
      var month = Number(match[2]);
      var year = Number(match[3]);
      var date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
      var now = new Date();
      var age = now.getUTCFullYear() - year;
      return year >= 1900 && age >= 0 && age <= 120;
    }

    function normalized(value) {
      var text = String(value || '').toLowerCase();
      return text.normalize ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : text;
    }

    function requestText() {
      var category = document.getElementById('category');
      var implanon = document.getElementById('implanonChoice');
      var subject = document.getElementById('subject');
      return category && category.value === 'Implanon'
        ? String(implanon && implanon.value || '').trim()
        : String(subject && subject.value || '').trim();
    }

    function dentalSelected() {
      return Boolean(document.querySelector(
        '#dentalSlots .sheet-dental-choice.selected:not(:disabled), #dentalSlots .slot.selected:not(:disabled)'
      ));
    }

    function formReady() {
      var category = document.getElementById('category');
      var name = document.getElementById('name');
      var birth = document.getElementById('birth');
      var locality = document.getElementById('locality');
      var routing = document.getElementById('routingAlert');
      var categoryValue = String(category && category.value || '').trim();
      var documentOk = validCpf(field.value) || validCns(field.value);
      var dental = normalized(categoryValue).indexOf('odontologico') !== -1;
      var clinicalBlocked = send.hidden || Boolean(routing && !routing.hidden);

      return Boolean(
        categoryValue &&
        name && name.value.trim().length >= 3 &&
        validBirth(birth && birth.value) &&
        documentOk &&
        locality && locality.value.trim() &&
        requestText() &&
        (!dental || dentalSelected()) &&
        !clinicalBlocked
      );
    }

    function refresh() {
      var valueDigits = onlyDigits(field.value);
      var cpfOk = validCpf(valueDigits);
      var cnsOk = validCns(valueDigits);

      if (status) {
        if (cnsOk) {
          status.textContent = 'CNS conferido ✓';
          status.className = 'help valid';
        } else if (cpfOk) {
          status.textContent = 'CPF conferido ✓';
          status.className = 'help valid';
        } else if (valueDigits.length === 15) {
          status.textContent = 'Confira os números do CNS.';
          status.className = 'help invalid';
        } else if (valueDigits.length === 11) {
          status.textContent = 'Confira os números do CPF.';
          status.className = 'help invalid';
        } else {
          status.textContent = 'Digite o CPF ou o Cartão Nacional de Saúde (CNS).';
          status.className = 'help';
        }
      }

      send.disabled = !formReady();
    }

    field.addEventListener('input', function (event) {
      var valueDigits = onlyDigits(field.value);
      if (valueDigits.length <= 11) return;
      event.stopImmediatePropagation();
      field.value = formatCns(valueDigits);
      setTimeout(function () {
        refresh();
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }, 0);
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target === field && onlyDigits(field.value).length > 11) return;
      setTimeout(refresh, 0);
    });
    document.addEventListener('change', function () {
      setTimeout(refresh, 0);
    });
    document.addEventListener('click', function () {
      setTimeout(refresh, 100);
    });

    var dentalSlots = document.getElementById('dentalSlots');
    if (dentalSlots && window.MutationObserver) {
      new MutationObserver(function () {
        setTimeout(refresh, 0);
      }).observe(dentalSlots, { childList: true, subtree: true, attributes: true });
    }

    [100, 400, 900, 1600].forEach(function (delay) {
      setTimeout(refresh, delay);
    });
  }

  addLink('manifest', 'manifest.webmanifest');
  addLink('icon', 'icon-tacs.svg', { type: 'image/svg+xml' });
  addLink('apple-touch-icon', 'icon-tacs.svg');
  installDentalTheme();
  installPublicContentModule();

  function init() {
    installOfflineBanner();
    installDentalReservationReturnReset();
    installCpfCnsCompatibility();
    installFormPersistence();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
