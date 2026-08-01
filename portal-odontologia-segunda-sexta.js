(function () {
  'use strict';

  var DAYS = [
    { name: 'Segunda-feira', badge: 'DIA OFICIAL' },
    { name: 'Terça-feira', badge: 'DIA OFICIAL' },
    { name: 'Quarta-feira', badge: 'SEM ATENDIMENTO PADRÃO' },
    { name: 'Quinta-feira', badge: 'DIA OFICIAL' },
    { name: 'Sexta-feira', badge: 'DIA EXTRA' }
  ];

  var changing = false;

  function el(id) {
    return document.getElementById(id);
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

  function currentCategory() {
    return clean(el('category') && el('category').value);
  }

  function dentalType() {
    var value = normalize(currentCategory());
    if (value.indexOf('odontologico') === -1) return '';
    return value.indexOf('emergencia') !== -1 ? 'emergencial' : 'comum';
  }

  function dentalSelected() {
    return Boolean(dentalType());
  }

  function formatDate(value) {
    var text = clean(value);
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return match[3] + '/' + match[2] + '/' + match[1];
    return text;
  }

  function setSubject(value) {
    var subject = el('subject');
    if (!subject || subject.value === value) return;
    subject.value = value;
    subject.dispatchEvent(new Event('input', { bubbles: true }));
    subject.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function genericDescriptionForCategory() {
    var value = normalize(currentCategory());

    if (value.indexOf('odontologico') !== -1) {
      return value.indexOf('emergencia') !== -1
        ? 'Solicitação de vaga odontológica de emergência para a dentista.'
        : 'Solicitação de vaga para atendimento odontológico com a dentista.';
    }

    if (value.indexOf('enfermeira') !== -1) {
      return 'Solicitação de atendimento com a Enfermeira Chefe.';
    }

    if (value.indexOf('nutricionista') !== -1) {
      return 'Solicitação de atendimento com a Nutricionista.';
    }

    if (value.indexOf('medica') !== -1 || value.indexOf('medico') !== -1) {
      return 'Solicitação de atendimento com a Médica.';
    }

    return '';
  }

  function syncDescriptionForCategory() {
    var description = genericDescriptionForCategory();
    if (description) setSubject(description);
  }

  function dentalDescriptionFromButton(button) {
    if (!button || button.disabled) return '';

    var day = clean(button.dataset.day);
    var date = clean(button.dataset.date);
    var type = clean(button.dataset.type) || dentalType();

    if (!day) {
      var strong = button.querySelector('strong');
      var span = button.querySelector('span');
      day = clean(strong && strong.textContent);
      date = clean(span && span.textContent);
    }

    var label = type === 'emergencial'
      ? 'Solicitação de vaga odontológica de emergência para a dentista'
      : 'Solicitação de vaga para atendimento odontológico com a dentista';

    return label + (day ? ' — ' + day : '') +
      (date ? ' — ' + formatDate(date) : '') + '.';
  }

  function professionalDescriptionFromButton(button) {
    if (!button || button.disabled) return '';

    var module = clean(button.dataset.module);
    var category = normalize(currentCategory());
    var label = '';

    if (module === 'enfermeira' || category.indexOf('enfermeira') !== -1) {
      label = 'Solicitação de atendimento com a Enfermeira Chefe';
    } else if (module === 'nutricionista' || category.indexOf('nutricionista') !== -1) {
      label = 'Solicitação de atendimento com a Nutricionista';
    } else if (module === 'medica' || category.indexOf('medica') !== -1 || category.indexOf('medico') !== -1) {
      label = 'Solicitação de atendimento com a Médica';
    }

    if (!label) return '';

    var day = clean(button.querySelector('strong') && button.querySelector('strong').textContent);
    var details = Array.prototype.map.call(button.querySelectorAll('em'), function (node) {
      return clean(node.textContent);
    }).filter(Boolean);
    var service = clean(button.querySelector('b') && button.querySelector('b').textContent);

    return label + (day ? ' — ' + day : '') +
      (details.length ? ' — ' + details.join(' — ') : '') +
      (service ? ': ' + service : '') + '.';
  }

  function installStyle() {
    if (el('odontologia-segunda-sexta-style')) return;
    var style = document.createElement('style');
    style.id = 'odontologia-segunda-sexta-style';
    style.textContent = [
      '#dentalSlots.dental-week-five{display:grid!important;grid-template-columns:1fr!important;gap:14px!important}',
      '#dentalSlots .slot{width:100%!important}',
      '#dentalSlots .dental-day-badge{display:block;margin:0 0 7px;color:#078940;font-size:12px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}',
      '#dentalSlots .dental-day-extra{color:#a85b00}',
      '#dentalSlots .dental-day-off{color:#6b7e88}',
      '#dentalSlots .dental-placeholder{min-height:116px!important;opacity:.78!important;background:#eef3f5!important;border-color:#a9bdc7!important;cursor:not-allowed!important}',
      '#dentalSlots .dental-placeholder b{color:#657b86!important}',
      '.dental-status.dental-fallback{color:#fff!important}',
      '@media(min-width:760px){#dentalSlots.dental-week-five{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function getDayFromButton(button) {
    var strong = button && button.querySelector('strong');
    return clean(strong && strong.textContent);
  }

  function addBadge(button, dayInfo) {
    if (!button || !dayInfo || button.querySelector('.dental-day-badge')) return;
    var badge = document.createElement('small');
    badge.className = 'dental-day-badge';
    if (dayInfo.name === 'Sexta-feira') badge.className += ' dental-day-extra';
    if (dayInfo.name === 'Quarta-feira') badge.className += ' dental-day-off';
    badge.textContent = dayInfo.badge;
    button.insertBefore(badge, button.firstChild);
  }

  function placeholder(dayInfo, message) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot dental-placeholder';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');

    var badge = document.createElement('small');
    badge.className = 'dental-day-badge';
    if (dayInfo.name === 'Sexta-feira') badge.className += ' dental-day-extra';
    if (dayInfo.name === 'Quarta-feira') badge.className += ' dental-day-off';
    badge.textContent = dayInfo.badge;

    var day = document.createElement('strong');
    day.textContent = dayInfo.name;

    var date = document.createElement('span');
    date.textContent = 'Data ainda não publicada';

    var status = document.createElement('b');
    status.textContent = message;

    button.append(badge, day, date, status);
    return button;
  }

  function statusIndicatesFailure(text) {
    var value = normalize(text);
    return value.indexOf('nao foi possivel carregar') !== -1 ||
      value.indexOf('agenda ainda nao foi informada') !== -1 ||
      value.indexOf('agenda precisa ser atualizada') !== -1 ||
      value.indexOf('agenda indisponivel') !== -1;
  }

  function applyDentalLayout() {
    if (changing || !dentalSelected()) return;

    var list = el('dentalSlots');
    var status = el('dentalStatus');
    if (!list || !status) return;

    var statusText = clean(status.textContent);
    if (normalize(statusText).indexOf('carregando') !== -1) return;

    changing = true;
    try {
      list.classList.add('dental-week-five');

      var existing = Array.prototype.slice.call(list.querySelectorAll('.slot'));
      var byDay = {};
      existing.forEach(function (button) {
        var day = getDayFromButton(button);
        if (day) byDay[normalize(day)] = button;
      });

      var failed = statusIndicatesFailure(statusText) || existing.length === 0;
      var fragment = document.createDocumentFragment();

      DAYS.forEach(function (dayInfo) {
        var button = byDay[normalize(dayInfo.name)];
        if (button) {
          button.dataset.day = dayInfo.name;
          var dateNode = button.querySelector('span');
          button.dataset.date = clean(dateNode && dateNode.textContent);
          button.dataset.type = dentalType();
          addBadge(button, dayInfo);
          fragment.appendChild(button);
          return;
        }

        var message = 'Vagas ainda não publicadas';
        if (dayInfo.name === 'Quarta-feira') message = 'Sem atendimento padrão';
        if (dayInfo.name === 'Sexta-feira') message = 'Disponível somente quando liberado';
        fragment.appendChild(placeholder(dayInfo, message));
      });

      list.replaceChildren(fragment);

      if (failed) {
        status.className = 'dental-status dental-fallback';
        status.textContent = 'Agenda exibida de segunda a sexta. Dias oficiais: segunda, terça e quinta. Sexta-feira é dia extra e fica disponível quando for liberada.';
      }
    } finally {
      changing = false;
    }
  }

  function bind() {
    installStyle();

    var category = el('category');
    if (category) {
      category.addEventListener('change', function () {
        syncDescriptionForCategory();
        setTimeout(syncDescriptionForCategory, 30);
        setTimeout(syncDescriptionForCategory, 180);
        setTimeout(applyDentalLayout, 50);
        setTimeout(applyDentalLayout, 500);
        setTimeout(applyDentalLayout, 13000);
      });
    }

    document.addEventListener('click', function (event) {
      var dental = event.target.closest && event.target.closest('#dentalSlots .slot:not(:disabled)');
      if (dental && dentalSelected()) {
        setTimeout(function () {
          var description = dentalDescriptionFromButton(dental);
          if (description) setSubject(description);
        }, 0);
        return;
      }

      var professional = event.target.closest && event.target.closest('.agenda-day:not(:disabled), .integral-day:not(:disabled)');
      if (professional) {
        setTimeout(function () {
          var description = professionalDescriptionFromButton(professional);
          if (description) setSubject(description);
        }, 0);
      }
    });

    var list = el('dentalSlots');
    var status = el('dentalStatus');
    if (list) {
      new MutationObserver(function () {
        if (!changing) setTimeout(applyDentalLayout, 0);
      }).observe(list, { childList: true, subtree: true });
    }
    if (status) {
      new MutationObserver(function () {
        if (!changing) setTimeout(applyDentalLayout, 0);
      }).observe(status, { childList: true, subtree: true, characterData: true });
    }

    syncDescriptionForCategory();
    setTimeout(syncDescriptionForCategory, 100);
    setTimeout(applyDentalLayout, 100);
    setTimeout(applyDentalLayout, 1000);
    setTimeout(applyDentalLayout, 13000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
}());
