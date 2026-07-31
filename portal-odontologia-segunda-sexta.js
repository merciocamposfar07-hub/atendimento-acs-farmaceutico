(function () {
  'use strict';

  var API = String(window.DENTAL_AGENDA_API_URL || '').trim();
  var COMMON_CATEGORY = 'Solicitar atendimento odontológico (dentista)';
  var EMERGENCY_CATEGORY = 'Solicitar atendimento odontológico de emergência (dentista)';
  var WEEKDAYS = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira'
  ];

  var state = {
    days: [],
    selected: null,
    loading: true,
    error: ''
  };

  function id(value) {
    return document.getElementById(value);
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalize(value) {
    var text = clean(value).toLowerCase();
    return text.normalize
      ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : text;
  }

  function isDentalCategory() {
    var category = id('category');
    return Boolean(category && normalize(category.value).indexOf('odontologico') !== -1);
  }

  function formatDate(value) {
    var text = clean(value);
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + '/' + match[2] + '/' + match[1] : text;
  }

  function numberOrNull(value) {
    if (value === null || value === '' || typeof value === 'undefined') return null;
    var number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
  }

  function addStyles() {
    if (id('dental-week-complete-style')) return;
    var style = document.createElement('style');
    style.id = 'dental-week-complete-style';
    style.textContent = [
      '#dentalSlots.dental-week-complete{display:grid!important;grid-template-columns:1fr!important;gap:14px!important}',
      '.dental-complete-day{padding:16px;border:1px solid #4f829b;border-radius:17px;background:rgba(255,255,255,.08)}',
      '.dental-complete-day-header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;color:#fff}',
      '.dental-complete-day-header strong{font-size:21px;line-height:1.25}',
      '.dental-complete-day-header span{color:#d8e7ee;font-size:16px;font-weight:750}',
      '.dental-complete-choices{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '#dentalSlots .dental-choice{position:relative;min-height:126px!important;padding:17px!important;text-align:left!important}',
      '#dentalSlots .dental-choice small{display:block;margin-bottom:8px;color:#0d5f8a;font-size:13px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}',
      '#dentalSlots .dental-choice.emergency small{color:#a3302b}',
      '#dentalSlots .dental-choice strong{font-size:19px!important}',
      '#dentalSlots .dental-choice.selected{border-color:#16a85d!important;background:#ecf9f1!important;box-shadow:0 0 0 4px rgba(22,168,93,.22),0 10px 22px rgba(0,0,0,.14)!important}',
      '#dentalSlots .dental-choice.emergency.selected{border-color:#c54a43!important;background:#fff1f0!important;box-shadow:0 0 0 4px rgba(197,74,67,.18),0 10px 22px rgba(0,0,0,.14)!important}',
      '#dentalSlots .dental-choice:disabled{opacity:.68!important}',
      '.dental-selection-confirmation{margin-top:16px;padding:14px 15px;border:2px solid #70e39f;border-radius:14px;background:#e9f8ef;color:#075e31;font-size:16px;font-weight:900;line-height:1.45}',
      '@media(max-width:720px){.dental-complete-choices{grid-template-columns:1fr}.dental-complete-day{padding:13px}.dental-complete-day-header{display:block}.dental-complete-day-header span{display:block;margin-top:4px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function jsonp() {
    return new Promise(function (resolve, reject) {
      if (!API) {
        reject(new Error('Agenda odontológica não configurada.'));
        return;
      }

      var callback = 'portalDentalComplete' + Date.now() + Math.floor(Math.random() * 100000);
      var script = document.createElement('script');
      var finished = false;
      var timer = setTimeout(function () {
        finish(new Error('A agenda odontológica demorou para responder.'));
      }, 16000);

      function finish(error, data) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try {
          delete window[callback];
        } catch (ignore) {}
        if (script.parentNode) script.remove();
        if (error) reject(error);
        else resolve(data);
      }

      window[callback] = function (data) {
        if (!data || data.ok === false) {
          finish(new Error((data && data.message) || 'Agenda indisponível.'));
          return;
        }
        finish(null, data);
      };

      script.onerror = function () {
        finish(new Error('Não foi possível consultar a agenda odontológica.'));
      };

      script.src =
        API +
        (API.indexOf('?') === -1 ? '?' : '&') +
        'action=agenda&callback=' + encodeURIComponent(callback) +
        '&v=' + Date.now();
      document.head.appendChild(script);
    });
  }

  function normalizeDay(item) {
    return {
      id: clean(item && item.id),
      day: clean(item && (item.dia || item.day)),
      date: clean(item && (item.data || item.date)),
      common: numberOrNull(item && (
        typeof item.vagasComuns !== 'undefined' ? item.vagasComuns : item.common
      )),
      emergency: numberOrNull(item && (
        typeof item.vagasEmergenciais !== 'undefined' ? item.vagasEmergenciais : item.emergency
      ))
    };
  }

  function findDay(day) {
    var wanted = normalize(day);
    return state.days.find(function (item) {
      return normalize(item.day) === wanted;
    }) || null;
  }

  function vacancyText(value, label) {
    if (value === null) return label + ' ainda não informada';
    if (value === 0) return 'Sem ' + label.toLowerCase();
    return value + (value === 1 ? ' vaga disponível' : ' vagas disponíveis');
  }

  function choiceButton(day, item, type) {
    var isEmergency = type === 'emergencial';
    var count = item ? (isEmergency ? item.emergency : item.common) : null;
    var date = item ? formatDate(item.date) : '';
    var enabled = Boolean(item && item.date && count !== null && count > 0);
    var selected = Boolean(
      state.selected &&
      state.selected.day === day &&
      state.selected.type === type &&
      state.selected.date === clean(item && item.date)
    );

    return '<button type="button" class="slot dental-choice ' +
      (isEmergency ? 'emergency ' : 'common ') +
      (selected ? 'selected' : '') +
      '" data-dental-custom="1" data-day="' + day +
      '" data-date="' + clean(item && item.date) +
      '" data-type="' + type + '"' +
      (enabled ? '' : ' disabled') + '>' +
      '<small>' + (isEmergency ? 'Vaga emergencial' : 'Vaga comum') + '</small>' +
      '<strong>' + day + '</strong>' +
      '<span>' + (date || 'Data ainda não informada') + '</span>' +
      '<b>' + vacancyText(count, isEmergency ? 'Vaga emergencial' : 'Vaga comum') + '</b>' +
      '</button>';
  }

  function render() {
    var list = id('dentalSlots');
    var status = id('dentalStatus');
    var schedule = id('dentalSchedule');
    if (!list || !status || !schedule || !isDentalCategory()) return;

    list.className = 'slots dental-week-complete';

    if (state.loading) {
      list.innerHTML = '';
      status.textContent = 'Carregando vagas comuns e emergenciais de segunda a sexta...';
      status.className = 'dental-status';
      return;
    }

    if (state.error) {
      list.innerHTML = '';
      status.textContent = state.error;
      status.className = 'dental-status error';
      return;
    }

    list.innerHTML = WEEKDAYS.map(function (day) {
      var item = findDay(day);
      return '<section class="dental-complete-day" data-dental-day="' + day + '">' +
        '<div class="dental-complete-day-header"><strong>' + day + '</strong>' +
        '<span>' + (item && item.date ? formatDate(item.date) : 'Data ainda não publicada') + '</span></div>' +
        '<div class="dental-complete-choices">' +
        choiceButton(day, item, 'comum') +
        choiceButton(day, item, 'emergencial') +
        '</div></section>';
    }).join('');

    var oldConfirmation = id('dentalSelectionConfirmation');
    if (oldConfirmation) oldConfirmation.remove();

    if (state.selected) {
      var confirmation = document.createElement('div');
      confirmation.id = 'dentalSelectionConfirmation';
      confirmation.className = 'dental-selection-confirmation';
      confirmation.textContent =
        'Selecionado: ' + state.selected.day + ' — ' +
        formatDate(state.selected.date) + ' — ' +
        (state.selected.type === 'emergencial' ? 'vaga emergencial' : 'vaga comum') + '.';
      list.insertAdjacentElement('afterend', confirmation);
    }

    status.textContent =
      'Escolha a vaga comum ou emergencial no dia desejado. A reserva será feita quando a solicitação for enviada.';
    status.className = 'dental-status';

    list.querySelectorAll('.dental-choice:not(:disabled)').forEach(function (button) {
      button.addEventListener('click', selectChoice);
    });
  }

  function selectChoice(event) {
    var button = event.currentTarget;
    var type = clean(button.dataset.type);
    var day = clean(button.dataset.day);
    var date = clean(button.dataset.date);
    var category = id('category');

    state.selected = { day: day, date: date, type: type };

    if (category) {
      category.value = type === 'emergencial' ? EMERGENCY_CATEGORY : COMMON_CATEGORY;
    }

    var subject = id('subject');
    if (subject) {
      subject.value =
        (type === 'emergencial'
          ? 'Atendimento odontológico de emergência (dentista)'
          : 'Atendimento odontológico (dentista)') +
        ' - ' + day + ' - ' + formatDate(date) + ' - ' +
        (type === 'emergencial' ? 'vaga emergencial' : 'vaga comum');
      subject.dispatchEvent(new Event('input', { bubbles: true }));
    }

    var emergencyNotice = id('dentalEmergency');
    if (emergencyNotice) emergencyNotice.hidden = type !== 'emergencial';

    render();
    setTimeout(syncOriginalSend, 0);
    setTimeout(syncOriginalSend, 80);

    var subjectField = id('subjectField');
    if (subjectField) {
      subjectField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function identityReady() {
    var name = clean(id('name') && id('name').value);
    var birth = clean(id('birth') && id('birth').value);
    var documentNumber = clean(id('cpf') && id('cpf').value).replace(/\D/g, '');
    var locality = clean(id('locality') && id('locality').value);
    var subject = clean(id('subject') && id('subject').value);
    var cpfStatus = id('cpfStatus');
    var ageStatus = id('ageStatus');

    return Boolean(
      name.length >= 3 &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(birth) &&
      documentNumber.length === 11 &&
      locality &&
      subject &&
      (!cpfStatus || cpfStatus.classList.contains('valid')) &&
      (!ageStatus || ageStatus.classList.contains('valid'))
    );
  }

  function syncOriginalSend() {
    var send = id('send');
    if (!send || !isDentalCategory()) return;
    var ready = Boolean(state.selected && identityReady());
    if (send.disabled === ready) send.disabled = !ready;
    send.hidden = false;
    send.setAttribute('aria-hidden', 'true');
  }

  function observeOriginalRender() {
    var list = id('dentalSlots');
    if (!list) return;
    new MutationObserver(function () {
      if (!isDentalCategory()) return;
      if (!list.querySelector('[data-dental-custom="1"]')) {
        setTimeout(render, 0);
      }
    }).observe(list, { childList: true, subtree: true });
  }

  function load() {
    state.loading = true;
    state.error = '';
    render();
    jsonp()
      .then(function (data) {
        state.days = (Array.isArray(data.dias) ? data.dias : [])
          .map(normalizeDay)
          .filter(function (item) { return item.day; });
        state.loading = false;
        render();
        syncOriginalSend();
      })
      .catch(function (error) {
        state.loading = false;
        state.error = error.message || 'Não foi possível carregar a agenda odontológica.';
        render();
      });
  }

  function bind() {
    addStyles();

    var category = id('category');
    if (category) {
      category.addEventListener('change', function () {
        state.selected = null;
        if (isDentalCategory()) {
          setTimeout(render, 0);
          setTimeout(syncOriginalSend, 30);
        }
      });
    }

    ['name', 'birth', 'cpf', 'locality', 'subject'].forEach(function (fieldId) {
      var field = id(fieldId);
      if (!field) return;
      field.addEventListener('input', function () {
        setTimeout(syncOriginalSend, 0);
      });
      field.addEventListener('change', function () {
        setTimeout(syncOriginalSend, 0);
      });
    });

    observeOriginalRender();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
}());
