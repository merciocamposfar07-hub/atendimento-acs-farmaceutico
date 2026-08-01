(function () {
  'use strict';

  var WHATSAPP_NUMBER = '5581989613130';
  var DENTAL_REGULAR = 'Solicitar atendimento odontológico (dentista)';
  var DENTAL_EMERGENCY = 'Solicitar atendimento odontológico de emergência (dentista)';
  var DENTAL_DAYS = [
    { name: 'Segunda-feira', weekday: 1, badge: 'DIA OFICIAL' },
    { name: 'Terça-feira', weekday: 2, badge: 'DIA OFICIAL' },
    { name: 'Quinta-feira', weekday: 4, badge: 'DIA OFICIAL' },
    { name: 'Sexta-feira', weekday: 5, badge: 'DIA EXTRA' }
  ];

  var selectedDental = null;
  var dentalRendering = false;

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

  function categoryDentalType() {
    var value = normalize(currentCategory());
    if (value.indexOf('odontologico') === -1) return '';
    return value.indexOf('emergencia') !== -1 ? 'emergencial' : 'comum';
  }

  function isDentalCategory() {
    return Boolean(categoryDentalType());
  }

  function setSubject(value) {
    var subject = el('subject');
    if (!subject || subject.value === value) return;
    subject.value = value;
    subject.dispatchEvent(new Event('input', { bubbles: true }));
    subject.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function formatDate(value) {
    var text = clean(value);
    var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
    return text;
  }

  function recifeTodayParts() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) {
      values[part.type] = part.value;
    });
    return [Number(values.year), Number(values.month), Number(values.day)];
  }

  function nextDateForWeekday(weekday) {
    var parts = recifeTodayParts();
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    var diff = (weekday - date.getUTCDay() + 7) % 7;
    date.setUTCDate(date.getUTCDate() + diff);
    return date.getUTCFullYear() + '-' +
      String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(date.getUTCDate()).padStart(2, '0');
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

  function professionalDescriptionFromButton(button) {
    if (!button || button.disabled) return '';

    var module = clean(button.dataset.module);
    var category = normalize(currentCategory());
    var label = '';

    if (module === 'enfermeira' || category.indexOf('enfermeira') !== -1) {
      label = 'Solicitação de atendimento com a Enfermeira Chefe';
    } else if (module === 'nutricionista' || category.indexOf('nutricionista') !== -1) {
      label = 'Solicitação de atendimento com a Nutricionista';
    } else if (
      module === 'medica' ||
      category.indexOf('medica') !== -1 ||
      category.indexOf('medico') !== -1
    ) {
      label = 'Solicitação de atendimento com a Médica';
    }

    if (!label) return '';

    var day = clean(button.querySelector('strong') && button.querySelector('strong').textContent);
    var service = clean(button.querySelector('b') && button.querySelector('b').textContent);
    var details = Array.prototype.map.call(button.querySelectorAll('em'), function (node) {
      return clean(node.textContent);
    }).filter(Boolean);

    if (module === 'enfermeira' || category.indexOf('enfermeira') !== -1) {
      return label +
        (service ? ' para ' + service : '') +
        (day ? ' (' + day + ')' : '') + '.';
    }

    return label +
      (day ? ' — ' + day : '') +
      (details.length ? ' — ' + details.join(' — ') : '') +
      (service ? ': ' + service : '') + '.';
  }

  function dentalDescription(selection) {
    if (!selection) return '';
    var label = selection.type === 'emergencial'
      ? 'Solicitação de vaga odontológica de emergência para a dentista'
      : 'Solicitação de vaga para atendimento odontológico com a dentista';
    return label + ' — ' + selection.day + ' — ' + formatDate(selection.date) + '.';
  }

  function installStyle() {
    if (el('odontologia-vagas-duplas-style')) return;

    var style = document.createElement('style');
    style.id = 'odontologia-vagas-duplas-style';
    style.textContent = [
      '#dentalSlots.tacs-dental-grid{display:grid!important;grid-template-columns:1fr!important;gap:14px!important}',
      '#dentalSlots .tacs-dental-card{width:100%;padding:18px;border:2px solid #91aebb;border-radius:18px;background:#fff;color:#102b3c;box-shadow:0 10px 22px rgba(3,35,56,.10)}',
      '#dentalSlots .tacs-dental-badge{display:block;margin-bottom:8px;color:#078940;font-size:13px;font-weight:950;letter-spacing:.07em}',
      '#dentalSlots .tacs-dental-badge.extra{color:#a85b00}',
      '#dentalSlots .tacs-dental-day{display:block;font-size:25px;line-height:1.2}',
      '#dentalSlots .tacs-dental-date{display:block;margin-top:6px;color:#425b69;font-size:18px}',
      '#dentalSlots .tacs-dental-actions{display:grid;grid-template-columns:1fr;gap:10px;margin-top:16px}',
      '#dentalSlots .tacs-dental-choice{width:100%;min-height:58px;padding:13px 15px;border:2px solid;border-radius:14px;text-align:left;font-size:17px;font-weight:950;cursor:pointer}',
      '#dentalSlots .tacs-dental-choice.common{border-color:#15944d;background:#edf9f1;color:#08763a}',
      '#dentalSlots .tacs-dental-choice.emergency{border-color:#c84d44;background:#fff1ef;color:#a3302b}',
      '#dentalSlots .tacs-dental-choice.selected{box-shadow:0 0 0 4px rgba(13,95,138,.19);transform:translateY(-1px)}',
      '#dentalSlots .tacs-dental-choice:focus-visible{outline:3px solid #0d5f8a;outline-offset:2px}',
      '@media(min-width:760px){#dentalSlots.tacs-dental-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderDentalChoices(force) {
    if (!isDentalCategory()) return;

    var list = el('dentalSlots');
    var title = el('dentalTitle');
    var help = el('dentalHelp');
    var status = el('dentalStatus');
    if (!list || !title || !help || !status) return;

    if (!force && list.querySelector('.tacs-dental-card')) return;
    if (dentalRendering) return;

    dentalRendering = true;
    try {
      list.className = 'slots tacs-dental-grid';
      list.innerHTML = '';

      title.textContent = 'Escolha o dia e o tipo de vaga';
      help.textContent = 'Em cada dia abaixo existe 1 vaga comum e 1 vaga de emergência.';

      DENTAL_DAYS.forEach(function (dayInfo) {
        var date = nextDateForWeekday(dayInfo.weekday);
        var card = document.createElement('div');
        card.className = 'tacs-dental-card';

        var badge = document.createElement('small');
        badge.className = 'tacs-dental-badge' +
          (dayInfo.name === 'Sexta-feira' ? ' extra' : '');
        badge.textContent = dayInfo.badge;

        var day = document.createElement('strong');
        day.className = 'tacs-dental-day';
        day.textContent = dayInfo.name;

        var dateNode = document.createElement('span');
        dateNode.className = 'tacs-dental-date';
        dateNode.textContent = formatDate(date);

        var actions = document.createElement('div');
        actions.className = 'tacs-dental-actions';

        var common = document.createElement('button');
        common.type = 'button';
        common.className = 'tacs-dental-choice common';
        common.dataset.day = dayInfo.name;
        common.dataset.date = date;
        common.dataset.type = 'comum';
        common.textContent = '1 vaga comum disponível';

        var emergency = document.createElement('button');
        emergency.type = 'button';
        emergency.className = 'tacs-dental-choice emergency';
        emergency.dataset.day = dayInfo.name;
        emergency.dataset.date = date;
        emergency.dataset.type = 'emergencial';
        emergency.textContent = '🚨 1 vaga de emergência disponível';

        if (
          selectedDental &&
          selectedDental.day === dayInfo.name &&
          selectedDental.type === 'comum'
        ) {
          common.classList.add('selected');
        }

        if (
          selectedDental &&
          selectedDental.day === dayInfo.name &&
          selectedDental.type === 'emergencial'
        ) {
          emergency.classList.add('selected');
        }

        actions.append(common, emergency);
        card.append(badge, day, dateNode, actions);
        list.appendChild(card);
      });

      status.className = 'dental-status';
      status.textContent = selectedDental
        ? 'Selecionado: ' + selectedDental.day + ' — vaga ' +
          (selectedDental.type === 'emergencial' ? 'de emergência' : 'comum') + '.'
        : 'Toque na vaga comum ou na vaga de emergência do dia desejado.';
    } finally {
      dentalRendering = false;
    }
  }

  function validCpf(value) {
    var digits = clean(value).replace(/\D/g, '');
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    var sum = 0;
    var i;
    for (i = 0; i < 9; i += 1) sum += Number(digits.charAt(i)) * (10 - i);
    var first = (sum * 10) % 11;
    if (first === 10) first = 0;
    if (first !== Number(digits.charAt(9))) return false;
    sum = 0;
    for (i = 0; i < 10; i += 1) sum += Number(digits.charAt(i)) * (11 - i);
    var second = (sum * 10) % 11;
    if (second === 10) second = 0;
    return second === Number(digits.charAt(10));
  }

  function ageFromBirth(value) {
    var text = clean(value);
    var match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    var birth = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
    if (
      birth.getUTCFullYear() !== Number(match[3]) ||
      birth.getUTCMonth() !== Number(match[2]) - 1 ||
      birth.getUTCDate() !== Number(match[1])
    ) return null;

    var todayParts = recifeTodayParts();
    var age = todayParts[0] - birth.getUTCFullYear();
    if (
      todayParts[1] - 1 < birth.getUTCMonth() ||
      (todayParts[1] - 1 === birth.getUTCMonth() && todayParts[2] < birth.getUTCDate())
    ) age -= 1;

    return age >= 0 && age <= 120 ? age : null;
  }

  function dentalFormReady() {
    if (!isDentalCategory() || !selectedDental) return false;
    var name = el('name');
    var locality = el('locality');
    var cpf = el('cpf');
    var birth = el('birth');
    var subject = el('subject');
    return Boolean(
      name && clean(name.value).length >= 3 &&
      locality && clean(locality.value) &&
      cpf && validCpf(cpf.value) &&
      birth && ageFromBirth(birth.value) !== null &&
      subject && clean(subject.value)
    );
  }

  function refreshDentalSend() {
    var send = el('send');
    if (!send || !isDentalCategory()) return;
    send.disabled = !dentalFormReady();
  }

  function recifeDateTime() {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date());
  }

  function requestCode() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var suffix = '';
    for (var i = 0; i < 4; i += 1) {
      suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    var parts = recifeTodayParts();
    return 'MATIAS-' + String(parts[2]).padStart(2, '0') +
      String(parts[1]).padStart(2, '0') + String(parts[0]).slice(2) + '-' + suffix;
  }

  function openDentalWhatsApp() {
    if (!dentalFormReady()) {
      refreshDentalSend();
      return;
    }

    var age = ageFromBirth(el('birth').value);
    var category = selectedDental.type === 'emergencial'
      ? DENTAL_EMERGENCY
      : DENTAL_REGULAR;

    var message =
      '*SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS*\n' +
      '*TACS - Técnico Agente Comunitário de Saúde*\n' +
      '*TACS responsável: Mércio José Campos dos Santos*\n\n' +
      'Código: ' + requestCode() + '\n' +
      'Data e horário do envio: ' + recifeDateTime() + '\n' +
      'Categoria: ' + category + '\n' +
      'Tipo de vaga odontológica: ' +
        (selectedDental.type === 'emergencial' ? 'emergencial' : 'comum') + '\n' +
      'Dia escolhido: ' + selectedDental.day + ' — ' + formatDate(selectedDental.date) + '\n' +
      'Nome completo: ' + clean(el('name').value) + '\n' +
      'Data de nascimento: ' + clean(el('birth').value) + '\n' +
      'Idade: ' + age + (age === 1 ? ' ano' : ' anos') + '\n' +
      'CPF: ' + clean(el('cpf').value) + '\n' +
      'Onde mora: ' + clean(el('locality').value) + '\n' +
      'Descrição: ' + clean(el('subject').value) + '\n\n' +
      'Este código é apenas uma referência para localizar a conversa.';

    window.location.href = 'https://wa.me/' + WHATSAPP_NUMBER +
      '?text=' + encodeURIComponent(message);
  }

  function selectDentalChoice(button) {
    selectedDental = {
      day: clean(button.dataset.day),
      date: clean(button.dataset.date),
      type: clean(button.dataset.type)
    };

    var category = el('category');
    if (category) {
      category.value = selectedDental.type === 'emergencial'
        ? DENTAL_EMERGENCY
        : DENTAL_REGULAR;
      category.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setSubject(dentalDescription(selectedDental));
    setTimeout(function () {
      renderDentalChoices(true);
      refreshDentalSend();
    }, 0);
  }

  function bind() {
    installStyle();

    var category = el('category');
    if (category) {
      category.addEventListener('change', function () {
        var type = categoryDentalType();
        if (!type) {
          selectedDental = null;
          syncDescriptionForCategory();
          return;
        }

        if (selectedDental && selectedDental.type !== type) selectedDental = null;
        syncDescriptionForCategory();
        setTimeout(function () {
          renderDentalChoices(true);
          refreshDentalSend();
        }, 0);
      });
    }

    document.addEventListener('click', function (event) {
      var dentalButton = event.target.closest &&
        event.target.closest('#dentalSlots .tacs-dental-choice');
      if (dentalButton) {
        event.preventDefault();
        selectDentalChoice(dentalButton);
        return;
      }

      var professional = event.target.closest &&
        event.target.closest('.agenda-day:not(:disabled), .integral-day:not(:disabled)');
      if (professional) {
        setTimeout(function () {
          var description = professionalDescriptionFromButton(professional);
          if (description) setSubject(description);
        }, 0);
      }
    });

    var send = el('send');
    if (send) {
      send.addEventListener('click', function (event) {
        if (!isDentalCategory() || !selectedDental) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openDentalWhatsApp();
      }, true);

      new MutationObserver(function () {
        if (isDentalCategory() && selectedDental) refreshDentalSend();
      }).observe(send, { attributes: true, attributeFilter: ['disabled'] });
    }

    ['name', 'locality', 'cpf', 'birth', 'subject'].forEach(function (id) {
      var field = el(id);
      if (field) {
        field.addEventListener('input', function () {
          setTimeout(refreshDentalSend, 0);
        });
      }
    });

    var list = el('dentalSlots');
    if (list) {
      new MutationObserver(function () {
        if (!dentalRendering && isDentalCategory() && !list.querySelector('.tacs-dental-card')) {
          setTimeout(function () {
            renderDentalChoices(false);
            refreshDentalSend();
          }, 0);
        }
      }).observe(list, { childList: true, subtree: true });
    }

    syncDescriptionForCategory();
    if (isDentalCategory()) {
      setTimeout(function () {
        renderDentalChoices(true);
        refreshDentalSend();
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
}());
