(function () {
  'use strict';

  var DENTAL_API = String(window.DENTAL_AGENDA_API_URL || '').trim();
  var submissionCode = '';
  var reservedSelection = '';
  var reservationPromise = null;

  var PROFESSIONAL_CATEGORIES = {
    medica: 'Solicitar atendimento com a Médica',
    enfermeira: 'Solicitar atendimento com a Enfermeira Chefe',
    nutricionista: 'Solicitar atendimento com nutricionista'
  };

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

  function normalizeArea(value) {
    var text = clean(value).toUpperCase();
    if (text.normalize) text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  }

  function recifeParts() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var result = {};
    parts.forEach(function (part) {
      result[part.type] = Number(part.value);
    });
    return result;
  }

  function recifeDateTime() {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date());
  }

  function parseBirth(value) {
    var text = clean(value);
    var match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    var day = Number(match[1]);
    var month = Number(match[2]);
    var year = Number(match[3]);
    var date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return { year: year, month: month, day: day };
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function compareDate(a, b) {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }

  function addYears(date, amount) {
    var year = date.year + amount;
    return {
      year: year,
      month: date.month,
      day: Math.min(date.day, daysInMonth(year, date.month))
    };
  }

  function addMonths(date, amount) {
    var total = date.year * 12 + (date.month - 1) + amount;
    var year = Math.floor(total / 12);
    var month = (total % 12) + 1;
    return {
      year: year,
      month: month,
      day: Math.min(date.day, daysInMonth(year, month))
    };
  }

  function utcStamp(date) {
    return Date.UTC(date.year, date.month - 1, date.day);
  }

  function detailedAge(value) {
    var birth = parseBirth(value);
    if (!birth) return 'Não informada';
    var today = recifeParts();
    if (compareDate(birth, today) > 0) return 'Não informada';

    var totalDays = Math.floor((utcStamp(today) - utcStamp(birth)) / 86400000);
    if (totalDays < 31) {
      return totalDays + (totalDays === 1 ? ' dia' : ' dias');
    }

    var years = today.year - birth.year;
    if (compareDate(addYears(birth, years), today) > 0) years -= 1;
    var afterYears = addYears(birth, years);

    var months = 0;
    while (months < 12 && compareDate(addMonths(afterYears, months + 1), today) <= 0) {
      months += 1;
    }
    var afterMonths = addMonths(afterYears, months);
    var days = Math.floor((utcStamp(today) - utcStamp(afterMonths)) / 86400000);

    if (years >= 2) return years + ' anos';
    if (years === 1) {
      return '1 ano' + (months ? ' e ' + months + (months === 1 ? ' mês' : ' meses') : '');
    }
    return months + (months === 1 ? ' mês' : ' meses') +
      (days ? ' e ' + days + (days === 1 ? ' dia' : ' dias') : '');
  }

  function formatBirth(value) {
    var birth = parseBirth(value);
    if (!birth) return clean(value) || 'Não informada';
    return String(birth.day).padStart(2, '0') + '/' +
      String(birth.month).padStart(2, '0') + '/' + birth.year;
  }

  function territorySnapshot() {
    var identity = window.PortalTacsTerritoryIdentity || {};
    var params = new URLSearchParams(location.search || '');
    var areaId = normalizeArea(identity.areaId || params.get('area') || window.TACS_AREA_ID || 'JAPARANDUBA') || 'JAPARANDUBA';
    return {
      areaId: areaId,
      areaName: clean(identity.areaNome) || (areaId === 'JAPARANDUBA' ? 'Sítio Japaranduba' : areaId.replace(/_/g, ' ')),
      unitName: clean(identity.unidadeNome) || 'Unidade de Saúde Posto Matias',
      tacsName: clean(identity.tacsNome) || 'TACS responsável pela área'
    };
  }

  function ensureTerritory() {
    var branding = window.PortalTacsTerritoryBranding;
    if (branding && typeof branding.load === 'function') {
      return branding.load(false).catch(function () { return territorySnapshot(); }).then(function () {
        return territorySnapshot();
      });
    }
    return Promise.resolve(territorySnapshot());
  }

  function makeCode(identity) {
    if (submissionCode) return submissionCode;
    var today = recifeParts();
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var suffix = '';
    var values = new Uint8Array(4);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
      values.forEach(function (value) {
        suffix += alphabet.charAt(value % alphabet.length);
      });
    } else {
      for (var index = 0; index < 4; index += 1) {
        suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
    }
    var prefix = normalizeArea(identity && identity.areaId || 'TACS').slice(0, 18) || 'TACS';
    submissionCode = prefix + '-' +
      String(today.day).padStart(2, '0') +
      String(today.month).padStart(2, '0') +
      String(today.year).slice(-2) + '-' + suffix;
    return submissionCode;
  }

  function addStyles() {
    if (el('portal-final-fixes-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-final-fixes-style';
    style.textContent = [
      '#send{display:none!important}',
      '#sendWrittenTacs,.tacs-written-button{display:none!important}',
      '.tacs-send-options{display:grid!important;gap:13px!important;margin-top:16px!important}',
      '.tacs-petroleum-button{width:100%;min-height:82px;border:3px solid #69c7e7;border-radius:18px;padding:16px 20px;background:linear-gradient(180deg,#0d5f8a,#062c46);color:#fff;font-size:21px;font-weight:950;line-height:1.22;cursor:pointer;box-shadow:0 14px 28px rgba(6,44,70,.25)}',
      '.tacs-petroleum-button small{display:block;margin-top:7px;font-size:15px;font-weight:750;color:#d8eef7}',
      '.tacs-petroleum-button:disabled{opacity:.43;box-shadow:none;cursor:not-allowed}',
      '.portal-agendas[hidden],.portal-agenda[hidden]{display:none!important}',
      '.notification-guide-all{margin-top:14px;padding:14px;border:1px solid #9fb9c7;border-radius:14px;background:#fff;color:#314b59}',
      '.notification-guide-all strong{display:block;margin-bottom:8px;color:#082b43;font-size:17px}',
      '.notification-guide-all p{margin:7px 0;font-size:15px;line-height:1.5}',
      '@keyframes tacsPublicAttentionPulse{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.035);filter:brightness(1.13)}}',
      '.integral-balloon>small{display:inline-flex!important;transform-origin:left center;animation:tacsPublicAttentionPulse 3.8s ease-in-out infinite}',
      '@media(prefers-reduced-motion:reduce){.integral-balloon>small{animation:none!important;transform:none!important}}',
      '@media(max-width:720px){.tacs-petroleum-button{font-size:20px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function optionExists(select, value) {
    return Array.prototype.some.call(select.options, function (option) {
      return option.value === value;
    });
  }

  function fixCategoryOptions() {
    var select = el('category');
    if (!select) return;

    [
      'Atendimento com a Médica',
      'Atendimento com a Enfermeira Chefe',
      'Atendimento com a Nutricionista'
    ].forEach(function (legacyValue) {
      Array.prototype.slice.call(select.options).forEach(function (option) {
        if (option.value === legacyValue) option.remove();
      });
    });

    [PROFESSIONAL_CATEGORIES.medica, PROFESSIONAL_CATEGORIES.enfermeira].forEach(function (value) {
      if (optionExists(select, value)) return;
      var option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.dataset.professionalModule = value === PROFESSIONAL_CATEGORIES.medica ? 'medica' : 'enfermeira';
      var dentalOption = Array.prototype.find.call(select.options, function (item) {
        return normalize(item.value).indexOf('odontologico') !== -1;
      });
      select.insertBefore(option, dentalOption || null);
    });

    Array.prototype.forEach.call(select.options, function (option) {
      if (option.value === PROFESSIONAL_CATEGORIES.medica) option.dataset.professionalModule = 'medica';
      else if (option.value === PROFESSIONAL_CATEGORIES.enfermeira) option.dataset.professionalModule = 'enfermeira';
      else if (option.value === PROFESSIONAL_CATEGORIES.nutricionista) option.dataset.professionalModule = 'nutricionista';
    });
  }

  function selectedProfessionalModule() {
    var select = el('category');
    var value = clean(select && select.value);
    var selected = select && select.options[select.selectedIndex];
    if (selected && selected.dataset.professionalModule) return clean(selected.dataset.professionalModule);
    if (value === PROFESSIONAL_CATEGORIES.medica) return 'medica';
    if (value === PROFESSIONAL_CATEGORIES.enfermeira) return 'enfermeira';
    if (value === PROFESSIONAL_CATEGORIES.nutricionista) return 'nutricionista';
    return '';
  }

  function updateAgendaVisibility() {
    var container = el('portalProfessionalAgendas');
    if (!container) return;
    var selected = selectedProfessionalModule();
    container.hidden = !selected;
    Array.prototype.forEach.call(container.querySelectorAll('.portal-agenda'), function (section) {
      section.hidden = clean(section.dataset.module) !== selected;
    });
    if (selected) {
      setTimeout(function () {
        var section = el('agenda-' + selected);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }

  function optionForModule(module) {
    var select = el('category');
    if (!select) return null;
    return Array.prototype.find.call(select.options, function (option) {
      return clean(option.dataset.professionalModule) === clean(module);
    });
  }

  function professionalCategory(module) {
    var option = optionForModule(module);
    return PROFESSIONAL_CATEGORIES[module] || clean(option && option.value);
  }

  function fillProfessionalDescription(button) {
    var module = clean(button.dataset.module);
    var section = el('agenda-' + module);
    if (!section) return;
    var category = professionalCategory(module);
    var strong = button.querySelector('strong');
    var service = button.querySelector('b');
    var details = Array.prototype.map.call(button.querySelectorAll('em'), function (node) {
      return clean(node.textContent);
    }).filter(Boolean);

    var categorySelect = el('category');
    if (categorySelect && category) categorySelect.value = category;

    var description = category + ' - ' + clean(strong && strong.textContent) +
      (details.length ? ' - ' + details.join(' - ') : '') + ': ' + clean(service && service.textContent);
    var subject = el('subject');
    if (subject) {
      subject.value = description;
      subject.dispatchEvent(new Event('input', { bubbles: true }));
    }
    updateAgendaVisibility();
  }

  function fillDentalDescription(button) {
    var category = clean(el('category') && el('category').value);
    var day = clean(button.querySelector('strong') && button.querySelector('strong').textContent);
    var date = clean(button.querySelector('span') && button.querySelector('span').textContent);
    var emergency = normalize(category).indexOf('emergencia') !== -1;
    var description = emergency
      ? 'Atendimento odontológico de emergência (dentista) - '
      : 'Atendimento odontológico (dentista) - ';
    description += day + ' - ' + date + ' - ' + (emergency ? 'vaga emergencial' : 'vaga comum');
    var subject = el('subject');
    if (subject) {
      subject.value = description;
      subject.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function installAgendaHooks() {
    var category = el('category');
    if (category) category.addEventListener('change', function () { setTimeout(updateAgendaVisibility, 0); });
    document.addEventListener('click', function (event) {
      var professional = event.target.closest('.agenda-day:not(:disabled)');
      if (professional) {
        setTimeout(function () { fillProfessionalDescription(professional); }, 0);
        return;
      }
      var dental = event.target.closest('#dentalSlots .slot:not(:disabled)');
      if (dental) setTimeout(function () { fillDentalDescription(dental); }, 0);
    });
    setTimeout(updateAgendaVisibility, 100);
  }

  function requestData(identity) {
    return {
      code: makeCode(identity),
      sentAt: recifeDateTime(),
      category: clean(el('category') && el('category').value),
      name: clean(el('name') && el('name').value),
      birth: formatBirth(el('birth') && el('birth').value),
      age: detailedAge(el('birth') && el('birth').value),
      document: clean(el('cpf') && el('cpf').value),
      locality: clean(el('locality') && el('locality').value),
      description: clean(el('subject') && el('subject').value),
      areaId: identity.areaId,
      areaName: identity.areaName,
      unitName: identity.unitName,
      tacsName: identity.tacsName
    };
  }

  function selectedDental() {
    var category = clean(el('category') && el('category').value);
    if (normalize(category).indexOf('odontologico') === -1) return null;
    var selected = document.querySelector('#dentalSlots .slot.selected');
    if (!selected) return null;
    var dateText = clean(selected.querySelector('span') && selected.querySelector('span').textContent);
    var match = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    var type = normalize(category).indexOf('emergencia') !== -1 ? 'emergencial' : 'comum';
    return {
      date: match[3] + '-' + match[2] + '-' + match[1],
      type: type,
      key: match[3] + '-' + match[2] + '-' + match[1] + '|' + type
    };
  }

  function reserveDentalIfNeeded() {
    var dental = selectedDental();
    if (!dental || !DENTAL_API) return Promise.resolve();
    if (reservedSelection === dental.key) return Promise.resolve();
    if (reservationPromise) return reservationPromise;

    reservationPromise = new Promise(function (resolve, reject) {
      var nonce = 'solicitacao-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      var frameName = 'reservaPortalTacs' + Date.now();
      var iframe = document.createElement('iframe');
      var form = document.createElement('form');
      var done = false;
      var timer;

      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        if (form.parentNode) form.remove();
        setTimeout(function () { if (iframe.parentNode) iframe.remove(); }, 250);
      }
      function finish(error, data) {
        if (done) return;
        done = true;
        cleanup();
        reservationPromise = null;
        if (error) reject(error);
        else {
          reservedSelection = dental.key;
          resolve(data);
        }
      }
      function receive(event) {
        if (event.source !== iframe.contentWindow) return;
        var data = event.data;
        if (!data || data.source !== 'agenda-odontologica-tacs' || data.nonce !== nonce) return;
        if (data.ok) finish(null, data);
        else finish(new Error(data.message || 'Não foi possível reservar a vaga.'));
      }
      function add(name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value);
        form.appendChild(input);
      }

      iframe.name = frameName;
      iframe.hidden = true;
      form.method = 'post';
      form.action = DENTAL_API;
      form.target = frameName;
      form.hidden = true;
      add('action', 'reservar');
      add('requestId', makeCode(territorySnapshot()));
      add('date', dental.date);
      add('type', dental.type);
      add('nonce', nonce);
      window.addEventListener('message', receive);
      document.body.append(iframe, form);
      timer = setTimeout(function () {
        finish(new Error('A confirmação da vaga demorou. Tente novamente.'));
      }, 20000);
      form.submit();
    });
    return reservationPromise;
  }

  function setButtonsBusy(busy) {
    var card = el('sendPetroleumCard');
    if (card) {
      card.disabled = busy || !formIsReady();
      card.innerHTML = busy
        ? 'Preparando card…<small>Confirmando os dados e a disponibilidade.</small>'
        : card.dataset.originalHtml || card.innerHTML;
    }
  }

  function formIsReady() {
    var original = el('send');
    return Boolean(original && !original.disabled && !original.hidden);
  }

  function wrapText(ctx, text, maxWidth) {
    var words = clean(text || 'Não informado').split(/\s+/);
    var lines = [];
    var line = '';
    words.forEach(function (word) {
      var test = line ? line + ' ' + word : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawLines(ctx, text, x, y, width, height, maxLines) {
    var lines = wrapText(ctx, text, width);
    var limit = Math.min(lines.length, maxLines || lines.length);
    for (var index = 0; index < limit; index += 1) {
      var value = lines[index];
      if (index === limit - 1 && lines.length > limit) value += '…';
      ctx.fillText(value, x, y + index * height);
    }
    return y + limit * height;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function escapeRegExp(value) {
    return String(value == null ? '' : value).replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  }

  function corporateRequest(data) {
    var service = clean(data.category).replace(/^Solicitar\s+/i, '') || 'Serviço informado';
    var raw = clean(data.description);
    [clean(data.category), service].forEach(function (prefix) {
      if (!prefix) return;
      raw = raw.replace(new RegExp('^' + escapeRegExp(prefix) + '\\s*(?:[-–:]\\s*)?', 'i'), '').trim();
    });
    var day = '';
    var dayMatch = raw.match(/^((?:Segunda|Terça|Terca|Quarta|Quinta|Sexta|Sábado|Sabado|Domingo)(?:-feira)?)\s*[-–]\s*/i);
    if (dayMatch) {
      day = clean(dayMatch[1]);
      raw = raw.slice(dayMatch[0].length).trim();
    }
    var status = '';
    var statusWithDetail = raw.match(/^Situa[cç][aã]o\s*:\s*([^:]+?)\s*:\s*(.+)$/i);
    if (statusWithDetail) {
      status = clean(statusWithDetail[1]);
      raw = clean(statusWithDetail[2]);
    } else {
      var statusOnly = raw.match(/^Situa[cç][aã]o\s*:\s*([^–-]+?)(?:\s*[-–]\s*(.+))?$/i);
      if (statusOnly) {
        status = clean(statusOnly[1]);
        raw = clean(statusOnly[2]);
      }
    }
    raw = raw.replace(/\s+-\s+/g, ' – ').trim();
    if (raw && !/[.!?]$/.test(raw)) raw += '.';
    return { service: service, description: raw || 'Não informada.', day: day, status: status };
  }

  function createPetroleumCard(data) {
    var summary = corporateRequest(data);
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#031b2d');
    gradient.addColorStop(0.55, '#073a55');
    gradient.addColorStop(1, '#0b5878');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = '#8df0b4';
    ctx.font = '900 36px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('PORTAL TACS • SOLICITAÇÃO', 60, 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 66px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SOLICITAÇÃO DO MORADOR', 60, 165);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, 52, 210, 976, 350, 30);
    ctx.fill();
    var infoY = 257;
    function identityBlock(label, value, valueSize, maxLines) {
      ctx.fillStyle = '#8df0b4';
      ctx.font = '900 24px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label, 82, infoY);
      infoY += 38;
      ctx.fillStyle = '#ffffff';
      ctx.font = '850 ' + valueSize + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      infoY = drawLines(ctx, value, 82, infoY, 890, valueSize + 7, maxLines) + 19;
    }
    identityBlock('ÁREA DE ATENDIMENTO', data.areaName, 38, 2);
    identityBlock('TACS RESPONSÁVEL', data.tacsName, 31, 2);
    identityBlock('UNIDADE DE SAÚDE', data.unitName, 29, 2);

    ctx.fillStyle = 'rgba(141,240,180,.13)';
    roundRect(ctx, 52, 590, 976, 180, 30);
    ctx.fill();
    ctx.fillStyle = '#8df0b4';
    ctx.font = '900 25px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SERVIÇO SOLICITADO', 82, 638);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    drawLines(ctx, summary.service, 82, 698, 900, 52, 2);

    ctx.fillStyle = 'rgba(255,255,255,.98)';
    roundRect(ctx, 48, 805, 984, 895, 38);
    ctx.fill();
    var cursor = 862;
    function block(label, value, maxLines, spacing, fontSize) {
      ctx.fillStyle = '#0b5878';
      ctx.font = '900 23px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label.toUpperCase(), 88, cursor);
      cursor += 33;
      ctx.fillStyle = '#102b3c';
      var size = fontSize || 36;
      ctx.font = '800 ' + size + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      cursor = drawLines(ctx, value, 88, cursor, 900, size + 7, maxLines) + (spacing || 18);
    }

    block('Nome completo', data.name, 2, 17, 38);
    block('Data e horário do envio', data.sentAt, 1, 16, 35);
    block('Nascimento e idade', data.birth + ' • ' + data.age, 2, 16, 35);
    block('CPF ou CNS', data.document, 1, 16, 35);
    block('Localidade / comunidade', data.locality, 3, 18, 34);
    block('Descrição da solicitação', summary.description, 4, 13, 34);
    if (summary.day) block('Dia informado', summary.day, 1, 12, 32);
    if (summary.status) block('Situação', summary.status, 1, 8, 32);

    ctx.fillStyle = '#8df0b4';
    ctx.fillRect(52, 1742, 976, 7);
    ctx.fillStyle = '#ffffff';
    ctx.font = '850 31px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Código: ' + data.code, 60, 1810);
    ctx.fillStyle = '#d8e7ee';
    ctx.font = '700 26px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Gerado pelo Portal TACS • ' + data.areaName, 60, 1855);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error('Não foi possível gerar o card.'));
        else resolve(blob);
      }, 'image/png', 1);
    });
  }

  function sendCard() {
    if (!formIsReady()) return;
    setButtonsBusy(true);
    ensureTerritory()
      .then(function (identity) {
        return reserveDentalIfNeeded().then(function () {
          var data = requestData(identity);
          return createPetroleumCard(data).then(function (blob) {
            var fileName = 'solicitacao-' + normalizeArea(identity.areaId).toLowerCase() + '-portal-tacs.png';
            var file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
              return navigator.share({
                title: 'Solicitação do morador',
                text: 'Solicitação do Portal TACS • ' + identity.areaName + ' • TACS ' + identity.tacsName + '.',
                files: [file]
              });
            }
            var url = URL.createObjectURL(blob);
            var opened = window.open(url, '_blank');
            if (!opened) window.location.href = url;
            setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
          });
        });
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        alert(error.message || 'Não foi possível gerar o card.');
      })
      .finally(function () { setButtonsBusy(false); });
  }

  function installSendOptions() {
    var original = el('send');
    if (!original) return;

    var wrapper = original.closest('.tacs-send-options');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'tacs-send-options';
      original.parentNode.insertBefore(wrapper, original);
      wrapper.appendChild(original);
    }

    ['sendCardTacs', 'sendWrittenTacs', 'sendPetroleumCard'].forEach(function (id) {
      var old = el(id);
      if (old) old.remove();
    });

    var card = document.createElement('button');
    card.type = 'button';
    card.id = 'sendPetroleumCard';
    card.className = 'tacs-petroleum-button';
    card.innerHTML = 'Enviar solicitação em card azul-petróleo<small>Card profissional com identificação da área e do TACS responsável.</small>';
    card.dataset.originalHtml = card.innerHTML;
    card.addEventListener('click', sendCard);
    wrapper.appendChild(card);

    function sync() {
      card.disabled = !formIsReady();
    }
    new MutationObserver(sync).observe(original, {
      attributes: true,
      attributeFilter: ['disabled', 'hidden']
    });
    ['input', 'change'].forEach(function (eventName) {
      document.addEventListener(eventName, function () { setTimeout(sync, 0); });
    });
    sync();
  }

  function fixNotificationInstructions() {
    var offer = el('notificationOffer');
    if (!offer || offer.querySelector('.notification-guide-all')) return;
    var guide = document.createElement('div');
    guide.className = 'notification-guide-all';
    guide.innerHTML =
      '<strong>Como configurar no celular</strong>' +
      '<p><b>iPhone:</b> abra no Safari → Compartilhar → Adicionar à Tela de Início → abra pelo novo ícone → toque em ativar avisos.</p>' +
      '<p><b>Android:</b> abra no Chrome → menu ⋮ → Instalar app ou Adicionar à tela inicial → abra o portal → permita as notificações.</p>';
    offer.appendChild(guide);
  }

  function install() {
    addStyles();
    fixCategoryOptions();
    installAgendaHooks();
    installSendOptions();
    fixNotificationInstructions();
    setTimeout(function () {
      fixCategoryOptions();
      updateAgendaVisibility();
      installSendOptions();
      fixNotificationInstructions();
    }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());