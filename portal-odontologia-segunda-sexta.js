(function () {
  'use strict';

  var WHATSAPP_NUMBER = '5581989613130';
  var DENTAL_REGULAR = 'Solicitar atendimento odontológico (dentista)';
  var DENTAL_EMERGENCY = 'Solicitar atendimento odontológico de emergência (dentista)';
  var DAYS = [
    { name: 'Segunda-feira', weekday: 1, badge: 'DIA OFICIAL' },
    { name: 'Terça-feira', weekday: 2, badge: 'DIA OFICIAL' },
    { name: 'Quinta-feira', weekday: 4, badge: 'DIA OFICIAL' },
    { name: 'Sexta-feira', weekday: 5, badge: 'DIA EXTRA' }
  ];

  var selected = null;
  var renderQueued = false;

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

  function dentalType() {
    var value = normalize(el('category') && el('category').value);
    if (value.indexOf('odontologico') === -1) return '';
    return value.indexOf('emergencia') !== -1 ? 'emergencial' : 'comum';
  }

  function isDental() {
    return Boolean(dentalType());
  }

  function setSubject(value) {
    var subject = el('subject');
    if (!subject || subject.value === value) return;
    subject.value = value;
    subject.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function recifeToday() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var value = {};
    parts.forEach(function (part) { value[part.type] = part.value; });
    return [Number(value.year), Number(value.month), Number(value.day)];
  }

  function nextDate(weekday) {
    var today = recifeToday();
    var date = new Date(Date.UTC(today[0], today[1] - 1, today[2]));
    var difference = (weekday - date.getUTCDay() + 7) % 7;
    date.setUTCDate(date.getUTCDate() + difference);
    return date.getUTCFullYear() + '-' +
      String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(date.getUTCDate()).padStart(2, '0');
  }

  function formatDate(value) {
    var match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + '/' + match[2] + '/' + match[1] : clean(value);
  }

  function descriptionForSelection() {
    if (!selected) return '';
    var prefix = selected.type === 'emergencial'
      ? 'Solicitação de vaga odontológica de emergência para a dentista'
      : 'Solicitação de vaga para atendimento odontológico com a dentista';
    return prefix + ' — ' + selected.day + ' — ' + formatDate(selected.date) + '.';
  }

  function genericDescription() {
    var value = normalize(el('category') && el('category').value);
    if (value.indexOf('odontologico') !== -1) {
      return value.indexOf('emergencia') !== -1
        ? 'Solicitação de vaga odontológica de emergência para a dentista.'
        : 'Solicitação de vaga para atendimento odontológico com a dentista.';
    }
    if (value.indexOf('enfermeira') !== -1) return 'Solicitação de atendimento com a Enfermeira Chefe.';
    if (value.indexOf('nutricionista') !== -1) return 'Solicitação de atendimento com a Nutricionista.';
    if (value.indexOf('medica') !== -1 || value.indexOf('medico') !== -1) return 'Solicitação de atendimento com a Médica.';
    return '';
  }

  function installStyle() {
    if (el('tacs-dental-stable-style')) return;
    var style = document.createElement('style');
    style.id = 'tacs-dental-stable-style';
    style.textContent = [
      'html,body,.shell,.panel,.content,.form-panel,.dental,#dentalSlots{-webkit-backface-visibility:visible!important;backface-visibility:visible!important;will-change:auto!important;contain:none!important}',
      'body{overflow-x:hidden!important}',
      '#dentalSlots.tacs-dental-grid{display:grid!important;grid-template-columns:1fr!important;gap:14px!important;min-height:0!important;height:auto!important}',
      '#dentalSlots .tacs-dental-card{width:100%;min-height:0;padding:18px;border:2px solid #91aebb;border-radius:18px;background:#fff;color:#102b3c;box-shadow:0 8px 20px rgba(3,35,56,.10)}',
      '#dentalSlots .tacs-dental-badge{display:block;margin-bottom:8px;color:#078940;font-size:13px;font-weight:950;letter-spacing:.07em}',
      '#dentalSlots .tacs-dental-badge.extra{color:#a85b00}',
      '#dentalSlots .tacs-dental-day{display:block;font-size:25px;line-height:1.2}',
      '#dentalSlots .tacs-dental-date{display:block;margin-top:6px;color:#425b69;font-size:18px}',
      '#dentalSlots .tacs-dental-actions{display:grid;grid-template-columns:1fr;gap:10px;margin-top:16px}',
      '#dentalSlots .tacs-dental-choice{width:100%;min-height:58px;padding:13px 15px;border:2px solid;border-radius:14px;text-align:left;font-size:17px;font-weight:950;cursor:pointer;appearance:none;-webkit-appearance:none}',
      '#dentalSlots .tacs-dental-choice.common{border-color:#15944d;background:#edf9f1;color:#08763a}',
      '#dentalSlots .tacs-dental-choice.emergency{border-color:#c84d44;background:#fff1ef;color:#a3302b}',
      '#dentalSlots .tacs-dental-choice.selected{box-shadow:0 0 0 4px rgba(13,95,138,.19)}',
      '@media(min-width:760px){#dentalSlots.tacs-dental-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderDental() {
    renderQueued = false;
    if (!isDental()) return;

    var list = el('dentalSlots');
    var title = el('dentalTitle');
    var help = el('dentalHelp');
    var status = el('dentalStatus');
    if (!list || !title || !help || !status) return;

    list.className = 'slots tacs-dental-grid';
    list.innerHTML = '';
    title.textContent = 'Escolha o dia e o tipo de vaga';
    help.textContent = 'Em cada dia há 1 vaga comum e 1 vaga de emergência.';

    DAYS.forEach(function (info) {
      var date = nextDate(info.weekday);
      var card = document.createElement('div');
      card.className = 'tacs-dental-card';

      var badge = document.createElement('small');
      badge.className = 'tacs-dental-badge' + (info.name === 'Sexta-feira' ? ' extra' : '');
      badge.textContent = info.badge;

      var day = document.createElement('strong');
      day.className = 'tacs-dental-day';
      day.textContent = info.name;

      var dateNode = document.createElement('span');
      dateNode.className = 'tacs-dental-date';
      dateNode.textContent = formatDate(date);

      var actions = document.createElement('div');
      actions.className = 'tacs-dental-actions';

      var common = document.createElement('button');
      common.type = 'button';
      common.className = 'tacs-dental-choice common';
      common.dataset.day = info.name;
      common.dataset.date = date;
      common.dataset.type = 'comum';
      common.textContent = '1 vaga comum disponível';

      var emergency = document.createElement('button');
      emergency.type = 'button';
      emergency.className = 'tacs-dental-choice emergency';
      emergency.dataset.day = info.name;
      emergency.dataset.date = date;
      emergency.dataset.type = 'emergencial';
      emergency.textContent = '🚨 1 vaga de emergência disponível';

      if (selected && selected.day === info.name && selected.type === 'comum') common.classList.add('selected');
      if (selected && selected.day === info.name && selected.type === 'emergencial') emergency.classList.add('selected');

      actions.append(common, emergency);
      card.append(badge, day, dateNode, actions);
      list.appendChild(card);
    });

    status.className = 'dental-status';
    status.textContent = selected
      ? 'Selecionado: ' + selected.day + ' — vaga ' + (selected.type === 'emergencial' ? 'de emergência' : 'comum') + '.'
      : 'Toque na vaga comum ou na vaga de emergência do dia desejado.';
  }

  function queueRender() {
    if (!isDental() || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(renderDental);
    });
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
    var match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    var day = Number(match[1]);
    var month = Number(match[2]);
    var year = Number(match[3]);
    var birth = new Date(Date.UTC(year, month - 1, day));
    if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
    var today = recifeToday();
    var age = today[0] - year;
    if (today[1] < month || (today[1] === month && today[2] < day)) age -= 1;
    return age >= 0 && age <= 120 ? age : null;
  }

  function formReady() {
    return Boolean(
      selected &&
      clean(el('name') && el('name').value).length >= 3 &&
      clean(el('locality') && el('locality').value) &&
      validCpf(el('cpf') && el('cpf').value) &&
      ageFromBirth(el('birth') && el('birth').value) !== null &&
      clean(el('subject') && el('subject').value)
    );
  }

  function refreshSend() {
    var send = el('send');
    if (!send || !isDental()) return;
    send.disabled = !formReady();
  }

  function recifeDateTime() {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date());
  }

  function makeCode() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var suffix = '';
    for (var i = 0; i < 4; i += 1) suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    var today = recifeToday();
    return 'MATIAS-' + String(today[2]).padStart(2, '0') + String(today[1]).padStart(2, '0') + String(today[0]).slice(2) + '-' + suffix;
  }

  function sendDental() {
    if (!formReady()) {
      refreshSend();
      return;
    }

    var age = ageFromBirth(el('birth').value);
    var category = selected.type === 'emergencial' ? DENTAL_EMERGENCY : DENTAL_REGULAR;
    var message = '*SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS*\n' +
      '*TACS - Técnico Agente Comunitário de Saúde*\n' +
      '*TACS responsável: Mércio José Campos dos Santos*\n\n' +
      'Código: ' + makeCode() + '\n' +
      'Data e horário do envio: ' + recifeDateTime() + '\n' +
      'Categoria: ' + category + '\n' +
      'Tipo de vaga odontológica: ' + (selected.type === 'emergencial' ? 'emergencial' : 'comum') + '\n' +
      'Dia escolhido: ' + selected.day + ' — ' + formatDate(selected.date) + '\n' +
      'Nome completo: ' + clean(el('name').value) + '\n' +
      'Data de nascimento: ' + clean(el('birth').value) + '\n' +
      'Idade: ' + age + (age === 1 ? ' ano' : ' anos') + '\n' +
      'CPF: ' + clean(el('cpf').value) + '\n' +
      'Onde mora: ' + clean(el('locality').value) + '\n' +
      'Descrição: ' + clean(el('subject').value) + '\n\n' +
      'Este código é apenas uma referência para localizar a conversa.';

    window.location.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  function selectDental(button) {
    selected = {
      day: clean(button.dataset.day),
      date: clean(button.dataset.date),
      type: clean(button.dataset.type)
    };

    var category = el('category');
    if (category) category.value = selected.type === 'emergencial' ? DENTAL_EMERGENCY : DENTAL_REGULAR;

    var warning = el('dentalEmergency');
    if (warning) warning.hidden = selected.type !== 'emergencial';

    setSubject(descriptionForSelection());
    queueRender();
    setTimeout(refreshSend, 0);
  }

  function professionalDescription(button) {
    if (!button || button.disabled) return '';
    var category = normalize(el('category') && el('category').value);
    var module = clean(button.dataset.module);
    var day = clean(button.querySelector('strong') && button.querySelector('strong').textContent);
    var service = clean(button.querySelector('b') && button.querySelector('b').textContent);
    var label = '';

    if (module === 'enfermeira' || category.indexOf('enfermeira') !== -1) label = 'Solicitação de atendimento com a Enfermeira Chefe';
    else if (module === 'nutricionista' || category.indexOf('nutricionista') !== -1) label = 'Solicitação de atendimento com a Nutricionista';
    else if (module === 'medica' || category.indexOf('medica') !== -1 || category.indexOf('medico') !== -1) label = 'Solicitação de atendimento com a Médica';

    if (!label) return '';
    return label + (service ? ' para ' + service : '') + (day ? ' (' + day + ')' : '') + '.';
  }

  function bind() {
    installStyle();

    var category = el('category');
    if (category) {
      category.addEventListener('change', function () {
        if (!isDental()) {
          selected = null;
          var description = genericDescription();
          if (description) setSubject(description);
          return;
        }
        if (selected && selected.type !== dentalType()) selected = null;
        var description = genericDescription();
        if (description) setSubject(description);
        queueRender();
        setTimeout(queueRender, 1000);
        setTimeout(queueRender, 13000);
      });
    }

    ['name', 'locality', 'cpf', 'birth', 'subject'].forEach(function (id) {
      var field = el(id);
      if (!field) return;
      field.addEventListener('input', function () {
        if (isDental()) {
          queueRender();
          setTimeout(refreshSend, 0);
        }
      });
    });

    document.addEventListener('click', function (event) {
      var dental = event.target.closest && event.target.closest('#dentalSlots .tacs-dental-choice');
      if (dental) {
        event.preventDefault();
        selectDental(dental);
        return;
      }

      var professional = event.target.closest && event.target.closest('.agenda-day:not(:disabled), .integral-day:not(:disabled)');
      if (professional) {
        setTimeout(function () {
          var description = professionalDescription(professional);
          if (description) setSubject(description);
        }, 0);
      }
    });

    var send = el('send');
    if (send) {
      send.addEventListener('click', function (event) {
        if (!isDental() || !selected) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        sendDental();
      }, true);
    }

    var description = genericDescription();
    if (description) setSubject(description);
    if (isDental()) {
      queueRender();
      setTimeout(queueRender, 1000);
      setTimeout(queueRender, 13000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
}());
