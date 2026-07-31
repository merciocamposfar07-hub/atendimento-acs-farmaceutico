(function () {
  'use strict';

  var WHATSAPP_NUMBER = '5581989613130';
  var TACS_NAME = 'Mércio José Campos dos Santos';
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

  function digits(value) {
    return clean(value).replace(/\D/g, '');
  }

  function normalize(value) {
    var text = clean(value).toLowerCase();
    return text.normalize
      ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : text;
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

    if (years >= 2) {
      return years + (years === 1 ? ' ano' : ' anos');
    }

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

  function makeCode() {
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
    submissionCode = 'MATIAS-' +
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
      '.tacs-send-options{display:grid!important;gap:13px!important;margin-top:16px!important}',
      '.tacs-written-button,.tacs-petroleum-button{width:100%;min-height:78px;border:0;border-radius:17px;padding:15px 20px;color:#fff;font-size:20px;font-weight:950;line-height:1.22;cursor:pointer}',
      '.tacs-written-button{background:linear-gradient(180deg,#08a44f,#078940);box-shadow:0 14px 28px rgba(7,137,64,.25)}',
      '.tacs-petroleum-button{background:linear-gradient(180deg,#0d5f8a,#062c46);box-shadow:0 14px 28px rgba(6,44,70,.25)}',
      '.tacs-written-button small,.tacs-petroleum-button small{display:block;margin-top:6px;font-size:14px;font-weight:750}',
      '.tacs-written-button:disabled,.tacs-petroleum-button:disabled{opacity:.43;box-shadow:none;cursor:not-allowed}',
      '.portal-agendas[hidden],.portal-agenda[hidden]{display:none!important}',
      '.notification-guide-all{margin-top:14px;padding:14px;border:1px solid #9fb9c7;border-radius:14px;background:#fff;color:#314b59}',
      '.notification-guide-all strong{display:block;margin-bottom:8px;color:#082b43;font-size:17px}',
      '.notification-guide-all p{margin:7px 0;font-size:15px;line-height:1.5}',
      '@media(max-width:720px){.tacs-written-button,.tacs-petroleum-button{font-size:19px}}'
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
      var dentalOption = Array.prototype.find.call(select.options, function (item) {
        return normalize(item.value).indexOf('odontologico') !== -1;
      });
      select.insertBefore(option, dentalOption || null);
    });
  }

  function selectedProfessionalModule() {
    var value = clean(el('category') && el('category').value);
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
    ['medica', 'enfermeira', 'nutricionista'].forEach(function (module) {
      var section = el('agenda-' + module);
      if (section) section.hidden = module !== selected;
    });
    if (selected) {
      setTimeout(function () {
        var section = el('agenda-' + selected);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }

  function professionalCategory(module) {
    return PROFESSIONAL_CATEGORIES[module] || '';
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
    if (categorySelect && category) {
      categorySelect.value = category;
    }

    var description = category + ' - ' + clean(strong && strong.textContent) +
      (details.length ? ' - ' + details.join(' - ') : '') + ': ' +
      clean(service && service.textContent);

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
    if (category) {
      category.addEventListener('change', function () {
        setTimeout(updateAgendaVisibility, 0);
      });
    }

    document.addEventListener('click', function (event) {
      var professional = event.target.closest('.agenda-day:not(:disabled)');
      if (professional) {
        setTimeout(function () {
          fillProfessionalDescription(professional);
        }, 0);
        return;
      }

      var dental = event.target.closest('#dentalSlots .slot:not(:disabled)');
      if (dental) {
        setTimeout(function () {
          fillDentalDescription(dental);
        }, 0);
      }
    });

    setTimeout(updateAgendaVisibility, 100);
  }

  function requestData() {
    return {
      code: makeCode(),
      sentAt: recifeDateTime(),
      category: clean(el('category') && el('category').value),
      name: clean(el('name') && el('name').value),
      birth: formatBirth(el('birth') && el('birth').value),
      age: detailedAge(el('birth') && el('birth').value),
      document: clean(el('cpf') && el('cpf').value),
      locality: clean(el('locality') && el('locality').value),
      description: clean(el('subject') && el('subject').value)
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
        setTimeout(function () {
          if (iframe.parentNode) iframe.remove();
        }, 250);
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
      add('requestId', makeCode());
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

  function writtenMessage(data) {
    return [
      '*SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS*',
      '*Área do TACS: ' + TACS_NAME + '*',
      '',
      'Código: ' + data.code,
      'Data e horário do envio: ' + data.sentAt,
      'Serviço solicitado: ' + data.category,
      'Nome completo: ' + data.name,
      'Data de nascimento: ' + data.birth,
      'Idade: ' + data.age,
      'CPF ou CNS: ' + data.document,
      'Onde mora: ' + data.locality,
      'Descrição: ' + data.description
    ].join('\n');
  }

  function openWhatsApp(message) {
    window.location.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  function setButtonsBusy(busy, text) {
    var written = el('sendWrittenTacs');
    var card = el('sendPetroleumCard');
    if (written) {
      written.disabled = busy || !formIsReady();
      if (text) written.dataset.originalHtml = written.dataset.originalHtml || written.innerHTML;
      written.innerHTML = text || written.dataset.originalHtml || written.innerHTML;
    }
    if (card) {
      card.disabled = busy || !formIsReady();
    }
  }

  function formIsReady() {
    var original = el('send');
    return Boolean(original && !original.disabled && !original.hidden);
  }

  function sendWritten() {
    if (!formIsReady()) return;
    setButtonsBusy(true, 'Preparando solicitação...');
    reserveDentalIfNeeded()
      .then(function () {
        openWhatsApp(writtenMessage(requestData()));
      })
      .catch(function (error) {
        alert(error.message || 'Não foi possível preparar a solicitação.');
        setButtonsBusy(false);
      });
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
      } else {
        line = test;
      }
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

  function createPetroleumCard(data) {
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#031b2d');
    gradient.addColorStop(0.55, '#062c46');
    gradient.addColorStop(1, '#0d5f8a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = '#70e39f';
    ctx.font = '900 34px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('PORTAL TACS • POSTO MATIAS', 62, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 62px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SOLICITAÇÃO DO MORADOR', 62, 180);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, 52, 225, 976, 154, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '850 34px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Área TACS — ' + TACS_NAME, 82, 290);
    ctx.font = '750 28px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Unidade de Saúde Posto Matias', 82, 338);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    var categoryEnd = drawLines(ctx, data.category, 62, 455, 950, 55, 3);

    var panelY = categoryEnd + 32;
    ctx.fillStyle = 'rgba(255,255,255,.97)';
    roundRect(ctx, 48, panelY, 984, 1080, 38);
    ctx.fill();

    var cursor = panelY + 75;
    function block(label, value, maxLines) {
      ctx.fillStyle = '#0d5f8a';
      ctx.font = '900 27px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label.toUpperCase(), 88, cursor);
      cursor += 44;
      ctx.fillStyle = '#102b3c';
      ctx.font = '800 42px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      cursor = drawLines(ctx, value, 88, cursor, 900, 50, maxLines) + 32;
    }

    block('Nome completo', data.name, 3);
    block('Nascimento e idade', data.birth + ' • ' + data.age, 2);
    block('CPF ou CNS', data.document, 2);
    block('Onde mora', data.locality, 4);
    block('Descrição', data.description, 7);

    ctx.fillStyle = '#ffffff';
    ctx.font = '850 32px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Código: ' + data.code, 62, 1770);
    ctx.fillStyle = '#d8e7ee';
    ctx.font = '700 27px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Enviado em ' + data.sentAt, 62, 1816);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error('Não foi possível gerar o card.'));
        else resolve(blob);
      }, 'image/png', 1);
    });
  }

  function sendCard() {
    if (!formIsReady()) return;
    setButtonsBusy(true, 'Preparando solicitação...');
    reserveDentalIfNeeded()
      .then(function () {
        var data = requestData();
        return createPetroleumCard(data).then(function (blob) {
          var file = new File([blob], 'solicitacao-portal-tacs.png', { type: 'image/png' });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            return navigator.share({
              title: 'Solicitação do morador',
              text: 'Solicitação da área TACS de ' + TACS_NAME + '.',
              files: [file]
            });
          }
          var url = URL.createObjectURL(blob);
          var opened = window.open(url, '_blank');
          if (!opened) window.location.href = url;
          setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
        });
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        alert(error.message || 'Não foi possível gerar o card.');
      })
      .finally(function () {
        setButtonsBusy(false);
      });
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

    var oldCard = el('sendCardTacs');
    if (oldCard) oldCard.remove();
    var oldWritten = el('sendWrittenTacs');
    if (oldWritten) oldWritten.remove();
    var oldPetroleum = el('sendPetroleumCard');
    if (oldPetroleum) oldPetroleum.remove();

    var written = document.createElement('button');
    written.type = 'button';
    written.id = 'sendWrittenTacs';
    written.className = 'tacs-written-button';
    written.innerHTML = 'Enviar solicitação por escrito no WhatsApp<small>Mensagem completa em texto para o TACS.</small>';
    written.dataset.originalHtml = written.innerHTML;
    written.addEventListener('click', sendWritten);

    var card = document.createElement('button');
    card.type = 'button';
    card.id = 'sendPetroleumCard';
    card.className = 'tacs-petroleum-button';
    card.innerHTML = 'Enviar solicitação em card azul-petróleo<small>Card com a identificação da área e do TACS responsável.</small>';
    card.addEventListener('click', sendCard);

    wrapper.appendChild(written);
    wrapper.appendChild(card);

    function sync() {
      var disabled = !formIsReady();
      written.disabled = disabled;
      card.disabled = disabled;
    }

    new MutationObserver(sync).observe(original, {
      attributes: true,
      attributeFilter: ['disabled', 'hidden']
    });
    ['input', 'change'].forEach(function (eventName) {
      document.addEventListener(eventName, function () {
        setTimeout(sync, 0);
      });
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
