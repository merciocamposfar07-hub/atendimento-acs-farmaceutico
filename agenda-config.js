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
window.TACS_ADMIN_API_URL = 'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';

(function () {
  'use strict';

  var PORTAL_AREA_STORAGE_KEY = 'portalTacsAreaIdV1';
  var PORTAL_DEFAULT_AREA_ID = 'JAPARANDUBA';

  function normalizePortalAreaId(value) {
    var area = String(value == null ? '' : value).trim().toUpperCase();
    if (area.normalize) area = area.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    area = area.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area) ? area : '';
  }

  function resolvePortalAreaId() {
    var fromUrl = '';
    try {
      var params = new URLSearchParams(window.location.search || '');
      fromUrl = normalizePortalAreaId(
        params.get('areaId') || params.get('area') || params.get('territorio')
      );
    } catch (error) {}
    if (fromUrl) {
      try { localStorage.setItem(PORTAL_AREA_STORAGE_KEY, fromUrl); } catch (error) {}
      return fromUrl;
    }

    // BASE_URL_TERRITORIO_CANONICO_V1: sem parâmetro de área, o link histórico é sempre Japaranduba.
    // O localStorage pode guardar a última área acessada, mas nunca pode transformar o link base em outra área.
    try { localStorage.setItem(PORTAL_AREA_STORAGE_KEY, PORTAL_DEFAULT_AREA_ID); } catch (error) {}
    return PORTAL_DEFAULT_AREA_ID;
  }

  function setPortalAreaId(value) {
    var next = normalizePortalAreaId(value) || PORTAL_DEFAULT_AREA_ID;
    window.TACS_AREA_ID = next;
    try { localStorage.setItem(PORTAL_AREA_STORAGE_KEY, next); } catch (error) {}
    return next;
  }

  window.TACS_DEFAULT_AREA_ID = PORTAL_DEFAULT_AREA_ID;
  window.TACS_AREA_ID = normalizePortalAreaId(window.TACS_AREA_ID) || resolvePortalAreaId();
  window.PortalTacsArea = Object.freeze({
    id: function () { return window.TACS_AREA_ID; },
    defaultId: PORTAL_DEFAULT_AREA_ID,
    storageKey: PORTAL_AREA_STORAGE_KEY,
    set: setPortalAreaId,
    normalize: normalizePortalAreaId
  });

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
      'assets/js/portal-conteudo-publico-v1.js?v=20260812-multiarea-v1',
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


  function installPortalContrast() {
    if (document.getElementById('portal-tacs-contrast-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-tacs-contrast-style';
    style.textContent = [
      '.portal-visual-pref{display:flex;justify-content:flex-end;margin:0 0 15px}',
      '.portal-contrast-btn{width:auto;min-height:48px;border:2px solid #0b5878;border-radius:15px;padding:10px 14px;background:#fff;color:#073a55;font-weight:900;box-shadow:0 6px 15px rgba(7,58,85,.09)}',
      'body.tema-petroleo .hero-actions,body.tema-petroleo .action-card,body.tema-petroleo .notice-board,body.tema-petroleo .notice-card,body.tema-petroleo .form-panel{background:linear-gradient(145deg,#073a55,#0b5878)!important;border-color:#69c7e7!important;color:#fff!important;box-shadow:0 10px 24px rgba(7,58,85,.18)!important}',
      'body.tema-petroleo .action-card+ .action-card{border-left-color:rgba(216,238,247,.35)!important}',
      'body.tema-petroleo .action-card strong,body.tema-petroleo .action-card p,body.tema-petroleo .notice-board h2,body.tema-petroleo .notice-updated,body.tema-petroleo .notice-card strong,body.tema-petroleo .notice-card p,body.tema-petroleo .notice-card small,body.tema-petroleo .form-panel .section-title,body.tema-petroleo .form-panel label{color:#fff!important}',
      'body.tema-petroleo .action-card small,body.tema-petroleo .form-panel .help.valid{color:#8df0b4!important}',
      'body.tema-petroleo .form-panel .help,body.tema-petroleo .privacy{color:#d8eef7!important}',
      'body.tema-petroleo .form-panel .help.invalid{color:#ffd5d2!important}',
      'body.tema-petroleo .portal-contrast-btn{background:#073a55;border-color:#69c7e7;color:#fff}',
      '@media(max-width:720px){.portal-visual-pref{margin-bottom:13px}.portal-contrast-btn{width:100%}body.tema-petroleo .action-card+ .action-card{border-left:0!important;border-top-color:rgba(216,238,247,.35)!important}}'
    ].join('');
    document.head.appendChild(style);

    var content = document.querySelector('.content');
    if (!content || document.getElementById('alternarContrastePortal')) return;
    var wrap = document.createElement('div');
    wrap.className = 'portal-visual-pref';
    var button = document.createElement('button');
    button.id = 'alternarContrastePortal';
    button.className = 'portal-contrast-btn';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    wrap.appendChild(button);
    content.insertBefore(wrap, content.firstChild);

    var key = 'portalTacsTemaPublicoV1';
    function readTheme() {
      try { return localStorage.getItem(key) === 'petroleo' ? 'petroleo' : 'claro'; }
      catch (error) { return 'claro'; }
    }
    function applyTheme(theme) {
      var dark = theme === 'petroleo';
      document.body.classList.toggle('tema-petroleo', dark);
      button.setAttribute('aria-pressed', dark ? 'true' : 'false');
      button.textContent = dark ? '◐ Usar cartões claros' : '◐ Usar cartões azul-petróleo';
    }
    button.addEventListener('click', function () {
      var next = document.body.classList.contains('tema-petroleo') ? 'claro' : 'petroleo';
      try { localStorage.setItem(key, next); } catch (error) {}
      applyTheme(next);
    });
    applyTheme(readTheme());
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

  function installDescriptionRules() {
    var category = document.getElementById('category');
    var subject = document.getElementById('subject');
    if (!category || !subject || category.dataset.descriptionRulesInstalled === '1') return;
    category.dataset.descriptionRulesInstalled = '1';

    function normalize(value) {
      var text = String(value || '').trim().toLowerCase();
      return text.normalize
        ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : text;
    }

    function updateDescription() {
      var selected = normalize(category.value);

      if (selected.indexOf('odontol') !== -1 || selected.indexOf('enfermeira') !== -1) {
        return;
      }

      if (selected.indexOf('medic') !== -1) {
        subject.value = 'Solicitação de atendimento com a Médica.';
      } else if (selected.indexOf('nutricion') !== -1) {
        subject.value = 'Solicitação de atendimento com a Nutricionista.';
      } else {
        subject.value = '';
      }

      subject.dispatchEvent(new Event('input', { bubbles: true }));
    }

    category.addEventListener('change', updateDescription);
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
        var implanonChoice = document.getElementById('implanonChoice');

        if (!send || !documentField || !category || !name || !birth || !locality || !subject) return;
        if (!isCns(documentField.value)) return;

        var description = category.value === 'Implanon' && implanonChoice
          ? implanonChoice.value.trim()
          : subject.value.trim();
        var dentalReady = !isDentalCategory(category.value) || selectedDentalVacancy();
        var ready =
          category.value.trim().length > 0 &&
          name.value.trim().length >= 3 &&
          /^\d{2}\/\d{2}\/\d{4}$/.test(birth.value.trim()) &&
          locality.value.trim().length > 0 &&
          description.length > 0 &&
          dentalReady;

        if (send.dataset && send.dataset.dentalReservationPending === '1') {
          send.disabled = true;
          return;
        }
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
      documentField.dataset.cnsOriginal = originalValue;
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

  function installCompactWhatsappMessage() {
    if (window.__tacsCompactWhatsappInstalled) return;
    window.__tacsCompactWhatsappInstalled = true;

    var originalEncodeURIComponent = window.encodeURIComponent;

    function fieldValue(id) {
      var field = document.getElementById(id);
      return field ? String(field.value || '').trim() : '';
    }

    function originalLine(message, prefix) {
      var lines = String(message || '').split('\n');
      for (var i = 0; i < lines.length; i += 1) {
        if (lines[i].indexOf(prefix) === 0) return lines[i].slice(prefix.length).trim();
      }
      return '';
    }

    function ageText() {
      var status = document.getElementById('ageStatus');
      if (!status) return '';
      return String(status.textContent || '').replace(/^Idade:\s*/i, '').trim();
    }

    function compactMessage(message) {
      var text = String(message || '');
      if (text.indexOf('*SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS*') !== 0) return text;

      var category = fieldValue('category');
      var description = category === 'Implanon' ? fieldValue('implanonChoice') : fieldValue('subject');
      var documentField = document.getElementById('cpf');
      var documentValue = documentField
        ? String(documentField.dataset.cnsOriginal || documentField.value || '').trim()
        : originalLine(text, 'CPF: ');
      var code = originalLine(text, 'Código: ');
      var sentAt = originalLine(text, 'Data e horário do envio: ');
      var birth = fieldValue('birth') || originalLine(text, 'Data de nascimento: ');
      var age = ageText() || originalLine(text, 'Idade: ');

      return [
        '*PORTAL TACS • POSTO MATIAS*',
        '*SOLICITAÇÃO DO MORADOR*',
        '',
        '*' + category + '*',
        '',
        '*Nome completo*',
        fieldValue('name'),
        '',
        '*Nascimento e idade*',
        birth + (age ? ' • ' + age : ''),
        '',
        '*CPF ou CNS*',
        documentValue,
        '',
        '*Onde mora*',
        fieldValue('locality'),
        '',
        '*Descrição*',
        description,
        '',
        '*Código:* ' + code,
        '*Enviado em:* ' + sentAt
      ].join('\n');
    }

    window.encodeURIComponent = function (value) {
      return originalEncodeURIComponent(compactMessage(value));
    };
  }

  addLink('manifest', 'manifest.webmanifest');
  addLink('icon', 'icon-tacs.svg', { type: 'image/svg+xml' });
  addLink('apple-touch-icon', 'icon-tacs.svg');
  installDentalTheme();
  installPublicContentModule();
  installCompactWhatsappMessage();

  function init() {
    installPortalContrast();
    installOfflineBanner();
    installDescriptionRules();
    installFormPersistence();
    installCnsWhatsappActivation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
