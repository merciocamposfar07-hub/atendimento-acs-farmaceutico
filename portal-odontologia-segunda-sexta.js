(function () {
  'use strict';

  var WHATSAPP_NUMBER = '5581989613130';
  var API = String(window.DENTAL_AGENDA_API_URL || '').trim();
  var REGULAR = 'Solicitar atendimento odontológico (dentista)';
  var EMERGENCY = 'Solicitar atendimento odontológico de emergência (dentista)';
  var ALLOWED_DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

  var slots = [];
  var selected = null;
  var loading = false;
  var rendering = false;
  var selecting = false;
  var requestCode = '';
  var reservationPending = false;

  function el(id) { return document.getElementById(id); }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalize(value) {
    var text = clean(value).toLowerCase();
    return text.normalize ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : text;
  }

  function categoryType() {
    var value = normalize(el('category') && el('category').value);
    if (value.indexOf('odontologico') === -1) return '';
    return value.indexOf('emergencia') !== -1 ? 'emergencial' : 'comum';
  }

  function isDental() { return Boolean(categoryType()); }

  function normalizeDate(value) {
    var text = clean(value);
    var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
    var br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return br[3] + '-' + br[2] + '-' + br[1];
    return '';
  }

  function formatDate(value) {
    var date = normalizeDate(value);
    if (!date) return 'Data não informada';
    var parts = date.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function dateStamp(value) {
    var date = normalizeDate(value);
    if (!date) return NaN;
    var parts = date.split('-').map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function recifeToday() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var result = {};
    parts.forEach(function (part) { result[part.type] = part.value; });
    return result.year + '-' + result.month + '-' + result.day;
  }

  function recifeDateTime() {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'short'
    }).format(new Date());
  }

  function currentDate(value) {
    var stamp = dateStamp(value);
    return Number.isFinite(stamp) && stamp >= dateStamp(recifeToday());
  }

  function numberValue(slot, type) {
    var candidates = type === 'emergencial'
      ? [slot.vagasEmergenciais, slot.emergency, slot.emergencial, slot.vagas_emergenciais]
      : [slot.vagasComuns, slot.common, slot.comum, slot.vagas_comuns];
    for (var i = 0; i < candidates.length; i += 1) {
      if (candidates[i] !== '' && candidates[i] !== null && candidates[i] !== undefined && Number.isFinite(Number(candidates[i]))) {
        return Math.max(0, Number(candidates[i]));
      }
    }
    return null;
  }

  function normalizeSlot(raw, index) {
    var day = clean(raw && (raw.dia || raw.day));
    var date = normalizeDate(raw && (raw.data || raw.date));
    if (ALLOWED_DAYS.indexOf(day) === -1 || !date || !currentDate(date)) return null;
    return {
      id: clean(raw.id || raw.codigo || raw.row || '') || day + '-' + date + '-' + index,
      day: day,
      date: date,
      common: numberValue(raw, 'comum'),
      emergency: numberValue(raw, 'emergencial')
    };
  }

  function setSubject(value) {
    var subject = el('subject');
    if (!subject || subject.value === value) return;
    subject.value = value;
    subject.dispatchEvent(new Event('input', { bubbles: true }));
    subject.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function descriptionForSelection() {
    if (!selected) return '';
    var prefix = selected.type === 'emergencial'
      ? 'Solicitação de vaga odontológica de emergência para a dentista'
      : 'Solicitação de vaga para atendimento odontológico com a dentista';
    return prefix + ' — ' + selected.day + ' — ' + formatDate(selected.date) + '.';
  }

  function installStyle() {
    if (el('dental-sheet-sync-style')) return;
    var style = document.createElement('style');
    style.id = 'dental-sheet-sync-style';
    style.textContent = [
      'html,body,.shell,.panel,.content,.form-panel,.dental,#dentalSlots{-webkit-backface-visibility:visible!important;backface-visibility:visible!important;will-change:auto!important;contain:none!important}',
      'body{overflow-x:hidden!important}',
      '#dentalSlots.sheet-dental-grid{display:grid!important;grid-template-columns:1fr!important;gap:14px!important;height:auto!important;min-height:0!important}',
      '#dentalSlots .sheet-dental-card{width:100%;padding:18px;border:2px solid #91aebb;border-radius:18px;background:#fff;color:#102b3c;box-shadow:0 8px 20px rgba(3,35,56,.10)}',
      '#dentalSlots .sheet-dental-badge{display:block;margin-bottom:8px;color:#078940;font-size:13px;font-weight:950;letter-spacing:.07em}',
      '#dentalSlots .sheet-dental-badge.extra{color:#a85b00}',
      '#dentalSlots .sheet-dental-day{display:block;font-size:25px;line-height:1.2}',
      '#dentalSlots .sheet-dental-date{display:block;margin-top:6px;color:#425b69;font-size:18px}',
      '#dentalSlots .sheet-dental-actions{display:grid;grid-template-columns:1fr;gap:10px;margin-top:16px}',
      '#dentalSlots .sheet-dental-choice{width:100%;min-height:58px;padding:13px 15px;border:2px solid;border-radius:14px;text-align:left;font-size:17px;font-weight:950;appearance:none;-webkit-appearance:none}',
      '#dentalSlots .sheet-dental-choice.common{border-color:#15944d;background:#edf9f1;color:#08763a}',
      '#dentalSlots .sheet-dental-choice.emergency{border-color:#c84d44;background:#fff1ef;color:#a3302b}',
      '#dentalSlots .sheet-dental-choice.selected{box-shadow:0 0 0 4px rgba(13,95,138,.19)}',
      '#dentalSlots .sheet-dental-choice:disabled{opacity:.55;cursor:not-allowed}',
      '@media(min-width:760px){#dentalSlots.sheet-dental-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function vacancyLabel(value, type) {
    if (value === null) return type === 'emergencial' ? 'Vaga de emergência não informada' : 'Vaga comum não informada';
    if (value <= 0) return type === 'emergencial' ? 'Sem vaga de emergência' : 'Sem vaga comum';
    if (type === 'emergencial') return '🚨 ' + value + (value === 1 ? ' vaga de emergência disponível' : ' vagas de emergência disponíveis');
    return value + (value === 1 ? ' vaga comum disponível' : ' vagas comuns disponíveis');
  }

  function renderAgenda() {
    if (!isDental()) return;
    var list = el('dentalSlots');
    var title = el('dentalTitle');
    var help = el('dentalHelp');
    var status = el('dentalStatus');
    if (!list || !title || !help || !status) return;

    rendering = true;
    list.dataset.sheetSync = '1';
    list.className = 'slots sheet-dental-grid';
    list.innerHTML = '';
    title.textContent = 'Escolha o dia e o tipo de vaga';
    help.textContent = 'Os dias e as quantidades abaixo vêm diretamente da planilha odontológica.';

    slots.forEach(function (slot) {
      var card = document.createElement('div');
      card.className = 'sheet-dental-card';

      var badge = document.createElement('small');
      badge.className = 'sheet-dental-badge' + (slot.day === 'Sexta-feira' ? ' extra' : '');
      badge.textContent = slot.day === 'Sexta-feira' ? 'DIA EXTRA' : (slot.day === 'Quarta-feira' ? 'DIA PUBLICADO' : 'DIA OFICIAL');

      var day = document.createElement('strong');
      day.className = 'sheet-dental-day';
      day.textContent = slot.day;

      var date = document.createElement('span');
      date.className = 'sheet-dental-date';
      date.textContent = formatDate(slot.date);

      var actions = document.createElement('div');
      actions.className = 'sheet-dental-actions';

      ['comum', 'emergencial'].forEach(function (type) {
        var value = type === 'emergencial' ? slot.emergency : slot.common;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'sheet-dental-choice ' + (type === 'emergencial' ? 'emergency' : 'common');
        button.dataset.id = slot.id;
        button.dataset.type = type;
        var sameReserved = Boolean(selected && selected.reserved && selected.id === slot.id && selected.type === type);
        button.disabled = reservationPending || value === null || value <= 0 || Boolean(selected && selected.reserved && !sameReserved);
        button.textContent = vacancyLabel(value, type);
        if (selected && selected.id === slot.id && selected.type === type) button.classList.add('selected');
        actions.appendChild(button);
      });

      card.append(badge, day, date, actions);
      list.appendChild(card);
    });

    status.className = 'dental-status';
    if (loading) status.textContent = 'Atualizando a agenda odontológica pela planilha...';
    else if (reservationPending && selected) status.textContent = 'Reservando a vaga escolhida e atualizando a quantidade...';
    else if (!slots.length) {
      status.textContent = 'Nenhum dia está publicado na planilha odontológica.';
      status.classList.add('error');
    } else if (selected && selected.reserved) {
      status.textContent = 'Vaga reservada. A quantidade foi atualizada automaticamente. Agora envie sua solicitação pelo WhatsApp.';
    } else if (selected) {
      status.textContent = 'Selecionado: ' + selected.day + ' — vaga ' + (selected.type === 'emergencial' ? 'de emergência' : 'comum') + '.';
    } else status.textContent = 'Toque na vaga comum ou na vaga de emergência do dia desejado.';
    rendering = false;
  }

  function loadAgenda() {
    if (!isDental() || loading) return;
    selected = null;
    if (!API) {
      slots = [];
      renderAgenda();
      var status = el('dentalStatus');
      if (status) status.textContent = 'A agenda odontológica não está conectada à planilha.';
      return;
    }

    loading = true;
    renderAgenda();
    var callbackName = 'dentalSheetSync' + Date.now() + Math.floor(Math.random() * 10000);
    var script = document.createElement('script');
    var finished = false;
    var timer = setTimeout(function () { finish(new Error('Tempo de resposta excedido.')); }, 15000);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
      if (script.parentNode) script.remove();
    }

    function finish(error, data) {
      if (finished) return;
      finished = true;
      cleanup();
      loading = false;
      if (error || !data || data.ok === false) {
        slots = [];
        renderAgenda();
        var status = el('dentalStatus');
        if (status) {
          status.textContent = error && error.message ? error.message : (data && data.message ? data.message : 'Não foi possível consultar a planilha odontológica.');
          status.className = 'dental-status error';
        }
        return;
      }

      var rows = Array.isArray(data.dias) ? data.dias : [];
      var normalized = [];
      rows.forEach(function (row, index) {
        var slot = normalizeSlot(row, index);
        if (slot) normalized.push(slot);
      });
      normalized.sort(function (a, b) { return dateStamp(a.date) - dateStamp(b.date); });
      slots = normalized;
      renderAgenda();
      refreshSend();
    }

    window[callbackName] = function (data) { finish(null, data); };
    script.onerror = function () { finish(new Error('Não foi possível consultar a planilha odontológica.')); };
    script.src = API + (API.indexOf('?') === -1 ? '?' : '&') + 'action=agenda&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();
    document.head.appendChild(script);
  }

  function selectSlot(button) {
    if (reservationPending || (selected && selected.reserved)) return;
    var slot = slots.find(function (item) { return item.id === button.dataset.id; });
    var type = clean(button.dataset.type);
    if (!slot || button.disabled) return;
    selected = { id: slot.id, day: slot.day, date: slot.date, type: type, reserved: false };

    var category = el('category');
    if (category) {
      selecting = true;
      category.value = type === 'emergencial' ? EMERGENCY : REGULAR;
      category.dispatchEvent(new Event('change', { bubbles: true }));
      selecting = false;
    }

    var warning = el('dentalEmergency');
    if (warning) warning.hidden = type !== 'emergencial';
    setSubject(descriptionForSelection());

    var send = el('send');
    var originalSendHtml = send ? send.innerHTML : '';
    reservationPending = true;
    if (send) {
      send.disabled = true;
      send.dataset.dentalReservationPending = '1';
      send.textContent = 'Reservando a vaga...';
    }
    renderAgenda();
    refreshSend();

    reserveSlot().then(function (result) {
      if (result && result.alreadyReserved && (normalizeDate(result.date) !== selected.date || clean(result.type) !== selected.type)) {
        throw new Error('Este formulário já reservou outra data. Reabra o portal para escolher uma nova vaga.');
      }
      var remaining = result && Number.isFinite(Number(result.remaining)) ? Number(result.remaining) : null;
      if (remaining !== null) {
        if (type === 'emergencial') slot.emergency = remaining;
        else slot.common = remaining;
      }
      selected.reserved = true;
      reservationPending = false;
      if (send) {
        send.innerHTML = originalSendHtml;
        delete send.dataset.dentalReservationPending;
      }
      renderAgenda();
      refreshSend();
    }).catch(function (error) {
      reservationPending = false;
      selected = null;
      if (send) {
        send.innerHTML = originalSendHtml;
        delete send.dataset.dentalReservationPending;
      }
      setSubject('');
      renderAgenda();
      refreshSend();
      var status = el('dentalStatus');
      if (status) {
        status.textContent = error && error.message ? error.message : 'Não foi possível reservar a vaga. Tente novamente.';
        status.className = 'dental-status error';
      }
      loadAgenda();
    });
  }

  function validCpf(value) {
    var digits = clean(value).replace(/\D/g, '');
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    var sum = 0, i;
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

  function birthDate(value) {
    var date = normalizeDate(value);
    if (!date) return null;
    var parts = date.split('-').map(Number);
    var result = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return result.getUTCFullYear() === parts[0] && result.getUTCMonth() === parts[1] - 1 && result.getUTCDate() === parts[2] ? result : null;
  }

  function ageLabel(value) {
    var birth = birthDate(value);
    if (!birth) return '';
    var todayParts = recifeToday().split('-').map(Number);
    var today = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
    var days = Math.floor((today.getTime() - birth.getTime()) / 86400000);
    if (days < 0) return '';
    if (days < 60) return days + (days === 1 ? ' dia' : ' dias');
    var months = (today.getUTCFullYear() - birth.getUTCFullYear()) * 12 + today.getUTCMonth() - birth.getUTCMonth();
    if (today.getUTCDate() < birth.getUTCDate()) months -= 1;
    if (months < 24) return months + (months === 1 ? ' mês' : ' meses');
    var years = today.getUTCFullYear() - birth.getUTCFullYear();
    if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years -= 1;
    return years + (years === 1 ? ' ano' : ' anos');
  }

  function formReady() {
    return Boolean(selected && clean(el('name') && el('name').value).length >= 3 && clean(el('locality') && el('locality').value) && validCpf(el('cpf') && el('cpf').value) && ageLabel(el('birth') && el('birth').value) && clean(el('subject') && el('subject').value));
  }

  function refreshSend() {
    var send = el('send');
    if (send && isDental()) send.disabled = reservationPending || !formReady();
  }

  function makeCode() {
    if (requestCode) return requestCode;
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var suffix = '';
    for (var i = 0; i < 4; i += 1) suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    var parts = recifeToday().split('-');
    requestCode = 'MATIAS-' + parts[2] + parts[1] + parts[0].slice(2) + '-' + suffix;
    return requestCode;
  }

  function reserveSlot() {
    return new Promise(function (resolve, reject) {
      if (!selected || !API) { reject(new Error('A vaga não está conectada à planilha.')); return; }
      var nonce = 'agenda-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      var frameName = 'dentalReserve' + Date.now();
      var iframe = document.createElement('iframe');
      var form = document.createElement('form');
      var finished = false;
      var timer;

      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        if (form.parentNode) form.remove();
        setTimeout(function () { if (iframe.parentNode) iframe.remove(); }, 200);
      }
      function finish(error, data) {
        if (finished) return;
        finished = true;
        cleanup();
        error ? reject(error) : resolve(data || {});
      }
      function receive(event) {
        if (event.source !== iframe.contentWindow) return;
        var data = event.data;
        if (!data || data.source !== 'agenda-odontologica-tacs' || data.nonce !== nonce) return;
        data.ok ? finish(null, data) : finish(new Error(data.message || 'Não foi possível reservar a vaga.'));
      }
      function add(name, value) {
        var input = document.createElement('input');
        input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
      }

      iframe.name = frameName; iframe.hidden = true; iframe.setAttribute('aria-hidden', 'true');
      form.method = 'post'; form.action = API; form.target = frameName; form.hidden = true;
      add('action', 'reservar'); add('requestId', makeCode()); add('date', selected.date); add('type', selected.type); add('nonce', nonce);
      window.addEventListener('message', receive);
      document.body.append(iframe, form);
      timer = setTimeout(function () { finish(new Error('A confirmação da vaga demorou. Tente novamente.')); }, 20000);
      form.submit();
    });
  }

  function openWhatsApp() {
    var age = ageLabel(el('birth').value);
    var category = selected.type === 'emergencial' ? EMERGENCY : REGULAR;
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
      'Idade: ' + age + '\n' +
      'CPF: ' + clean(el('cpf').value) + '\n' +
      'Onde mora: ' + clean(el('locality').value) + '\n' +
      'Descrição: ' + clean(el('subject').value) + '\n\n' +
      'Este código é apenas uma referência para localizar a conversa.';
    window.location.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  function sendDental(event) {
    if (!isDental() || !selected) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (reservationPending || !formReady()) { refreshSend(); return; }
    if (selected.reserved) {
      openWhatsApp();
      return;
    }

    var send = el('send');
    var original = send.innerHTML;
    send.disabled = true;
    send.textContent = 'Confirmando a vaga na planilha...';
    reservationPending = true;
    reserveSlot().then(function (result) {
      if (result && result.alreadyReserved && (normalizeDate(result.date) !== selected.date || clean(result.type) !== selected.type)) {
        throw new Error('Este formulário já reservou outra data. Reabra o portal para escolher uma nova vaga.');
      }
      var slot = slots.find(function (item) { return item.id === selected.id; });
      if (slot && result && Number.isFinite(Number(result.remaining))) {
        if (selected.type === 'emergencial') slot.emergency = Number(result.remaining);
        else slot.common = Number(result.remaining);
      }
      selected.reserved = true;
      reservationPending = false;
      send.innerHTML = original;
      renderAgenda();
      openWhatsApp();
    }).catch(function (error) {
      reservationPending = false;
      send.innerHTML = original;
      refreshSend();
      var status = el('dentalStatus');
      if (status) { status.textContent = error.message || 'Não foi possível confirmar a vaga.'; status.className = 'dental-status error'; }
      loadAgenda();
    });
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
    return label ? label + (service ? ' para ' + service : '') + (day ? ' (' + day + ')' : '') + '.' : '';
  }

  function bind() {
    installStyle();
    var category = el('category');
    if (category) category.addEventListener('change', function () {
      if (selecting) return;
      selected = null;
      if (isDental()) loadAgenda();
    });

    document.addEventListener('click', function (event) {
      var dentalButton = event.target.closest && event.target.closest('#dentalSlots .sheet-dental-choice');
      if (dentalButton) { event.preventDefault(); selectSlot(dentalButton); return; }
      var professional = event.target.closest && event.target.closest('.agenda-day:not(:disabled), .integral-day:not(:disabled)');
      if (professional) setTimeout(function () { var description = professionalDescription(professional); if (description) setSubject(description); }, 0);
    });

    ['name', 'locality', 'cpf', 'birth', 'subject'].forEach(function (id) {
      var field = el(id);
      if (field) field.addEventListener('input', refreshSend);
    });

    var send = el('send');
    if (send) send.addEventListener('click', sendDental, true);

    var list = el('dentalSlots');
    if (list) new MutationObserver(function () {
      if (rendering || !isDental() || !slots.length) return;
      if (!list.querySelector('.sheet-dental-card')) setTimeout(renderAgenda, 0);
    }).observe(list, { childList: true, subtree: true });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && isDental()) loadAgenda();
    });
    window.addEventListener('pageshow', function () { if (isDental()) loadAgenda(); });

    if (isDental()) loadAgenda();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
}());
