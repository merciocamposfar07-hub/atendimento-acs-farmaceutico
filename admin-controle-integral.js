(function () {
  'use strict';

  var MAIN = String(
    window.TACS_ADMIN_API_URL ||
      'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec'
  ).trim();
  var DENTAL = String(window.DENTAL_AGENDA_API_URL || '').trim();
  var DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  var DENTAL_DAYS = ['Segunda-feira', 'Terça-feira', 'Quinta-feira'];
  var KEY = 'tacs-admin-key';
  var refreshing = false;

  function defaultProfessional(module) {
    return DAYS.map(function (day) {
      var medicalFriday = module === 'medica' && day === 'Sexta-feira';
      return {
        day: day,
        active: medicalFriday,
        date: '',
        time: medicalFriday ? '08:00' : '',
        status: medicalFriday ? 'aguardando' : 'desativado',
        message: module === 'medica' ? 'Atendimento médico' : 'Atendimento com nutricionista',
        closeAtNoon: true
      };
    });
  }

  function defaultNurse() {
    return [
      {day: 'Segunda-feira', active: true, service: 'Visita', icon: '🏠'},
      {day: 'Terça-feira', active: true, service: 'Pré-natal', icon: '🤰'},
      {day: 'Quarta-feira', active: false, service: 'Folga', icon: '❌'},
      {day: 'Quinta-feira', active: true, service: 'Puericultura - acompanhamento de crianças e adolescentes', icon: '👶'},
      {day: 'Sexta-feira', active: true, service: 'Preventivo', icon: '🌸'}
    ];
  }

  function defaultDental() {
    return DENTAL_DAYS.map(function (day) {
      return {day: day, active: false, date: '', common: 0, emergency: 0};
    });
  }

  var state = {
    medica: defaultProfessional('medica'),
    nutricionista: defaultProfessional('nutricionista'),
    enfermeira: defaultNurse(),
    odontologia: defaultDental()
  };

  function id(value) {
    return document.getElementById(value);
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character];
    });
  }

  function savedKey() {
    try {
      return clean(localStorage.getItem(KEY) || sessionStorage.getItem(KEY));
    } catch (error) {
      return '';
    }
  }

  function status(target, text, type) {
    var element = typeof target === 'string' ? id(target) : target;
    if (!element) return;
    var dayStatus = element.classList.contains('day-status');
    element.textContent = text;
    element.className =
      'status' + (dayStatus ? ' day-status' : '') + (type ? ' ' + type : '');
  }

  function jsonp(api, action, extra) {
    return new Promise(function (resolve, reject) {
      if (!api) {
        reject(new Error('Serviço não configurado.'));
        return;
      }

      var callback = 'tacsReadback' + Date.now() + Math.floor(Math.random() * 100000);
      var script = document.createElement('script');
      var finished = false;
      var timer = setTimeout(function () {
        finish(new Error('O servidor demorou para responder.'));
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
        else if (!data || data.ok === false) reject(new Error((data && data.message) || 'O servidor recusou a leitura.'));
        else resolve(data);
      }

      window[callback] = function (data) {
        finish(null, data);
      };
      script.onerror = function () {
        finish(new Error('Falha ao consultar o servidor.'));
      };

      var query =
        'action=' + encodeURIComponent(action) +
        '&callback=' + encodeURIComponent(callback) +
        '&v=' + Date.now();
      Object.keys(extra || {}).forEach(function (name) {
        query += '&' + encodeURIComponent(name) + '=' + encodeURIComponent(extra[name]);
      });
      script.src = api + (api.indexOf('?') < 0 ? '?' : '&') + query;
      document.head.appendChild(script);
    });
  }

  function postForm(api, fields) {
    return new Promise(function (resolve, reject) {
      if (!api) {
        reject(new Error('Serviço não configurado.'));
        return;
      }

      var nonce = 'tacs-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      var frame = document.createElement('iframe');
      var form = document.createElement('form');
      var finished = false;
      var timer = setTimeout(function () {
        finish(new Error('O servidor não confirmou a gravação.'));
      }, 22000);

      frame.name = 'tacsFrame' + Date.now() + Math.floor(Math.random() * 1000);
      frame.hidden = true;
      form.method = 'post';
      form.action = api;
      form.target = frame.name;
      form.hidden = true;

      function add(name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value == null ? '' : value);
        form.appendChild(input);
      }

      function finish(error, result) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        if (form.parentNode) form.remove();
        setTimeout(function () {
          if (frame.parentNode) frame.remove();
        }, 250);
        if (error) reject(error);
        else resolve(result);
      }

      function receive(event) {
        if (event.source !== frame.contentWindow) return;
        var data = event.data;
        if (!data || typeof data !== 'object') return;
        var result = data.result || data;
        var receivedNonce = clean(data.nonce || result.nonce);
        var currentIntegral =
          api === MAIN &&
          data.source === 'painel-tacs-integral' &&
          receivedNonce === nonce;
        var currentDental =
          api === DENTAL &&
          data.source === 'agenda-odontologica-tacs' &&
          receivedNonce === nonce;
        var legacyMain =
          api === MAIN &&
          data.source === 'portal-tacs' &&
          !receivedNonce;
        if (!currentIntegral && !currentDental && !legacyMain) return;
        if (result.ok === false) {
          finish(new Error(result.message || 'O servidor recusou a gravação.'));
          return;
        }
        if (result.ok === true) finish(null, result);
      }

      Object.keys(fields).forEach(function (name) {
        add(name, fields[name]);
      });
      add('nonce', nonce);
      window.addEventListener('message', receive);
      document.body.append(frame, form);
      form.submit();
    });
  }

  function tab(name) {
    document.querySelectorAll('.tab').forEach(function (button) {
      button.classList.toggle('active', button.dataset.tab === name);
    });
    document.querySelectorAll('[data-section]').forEach(function (section) {
      section.hidden = section.dataset.section !== name;
    });
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(function (button) {
      button.addEventListener('click', function () {
        tab(button.dataset.tab);
      });
    });
  }

  function dayCard(module, item, index) {
    var active = !!item.active;
    var html =
      '<article class="day-card ' + (active ? 'active-day' : 'inactive-day') + '" data-index="' + index + '">' +
      '<div class="day-title"><strong>' + esc(item.day) + '</strong>' +
      '<span class="state-pill">' + (active ? 'ATIVO NO PORTAL' : 'DESATIVADO') + '</span></div>' +
      '<div class="day-controls">';

    if (module === 'odontologia') {
      html +=
        '<div class="switch-row"><label><input class="f-active" type="checkbox" ' + (active ? 'checked' : '') + '> Disponibilizar vagas nesta data</label></div>' +
        '<label>Data<input class="f-date" type="date" value="' + esc(item.date || '') + '"></label>' +
        '<label>Vagas comuns<input class="f-common" type="number" min="0" step="1" value="' + Number(item.common || 0) + '"></label>' +
        '<label>Vagas emergenciais<input class="f-emergency" type="number" min="0" step="1" value="' + Number(item.emergency || 0) + '"></label>';
    } else {
      html +=
        '<div class="switch-row"><label><input class="f-active" type="checkbox" ' + (active ? 'checked' : '') + '> Ativar este dia no Portal do Morador</label>';
      if (module !== 'enfermeira') {
        html += '<label><input class="f-noon" type="checkbox" ' + (item.closeAtNoon ? 'checked' : '') + '> Encerrar às 12h</label>';
      }
      html += '</div>';

      if (module === 'enfermeira') {
        html +=
          '<label>Ícone<input class="f-icon" value="' + esc(item.icon || '') + '"></label>' +
          '<label>Atendimento<input class="f-service" value="' + esc(item.service || '') + '"></label>';
      } else {
        html +=
          '<label>Data<input class="f-date" type="date" value="' + esc(item.date || '') + '"></label>' +
          '<label>Horário<input class="f-time" type="time" value="' + esc(item.time || '') + '"></label>' +
          '<label>Situação<select class="f-status">' +
          '<option value="aguardando"' + (item.status === 'aguardando' ? ' selected' : '') + '>Aguardando confirmação</option>' +
          '<option value="confirmado"' + (item.status === 'confirmado' ? ' selected' : '') + '>Confirmado</option>' +
          '<option value="alterado"' + (item.status === 'alterado' ? ' selected' : '') + '>Data alterada</option>' +
          '<option value="cancelado"' + (item.status === 'cancelado' ? ' selected' : '') + '>Cancelado</option>' +
          '</select></label>' +
          '<label class="full">Texto exibido<input class="f-message" value="' + esc(item.message || '') + '"></label>';
      }
    }

    html +=
      '</div><div class="day-actions">' +
      '<button class="btn publish b-publish" type="button">Publicar e conferir</button>' +
      '<button class="btn cancel b-cancel" type="button">Retirar do portal</button>' +
      '</div><div class="status day-status">Edite os dados e publique este dia.</div></article>';
    return html;
  }

  function readDay(card, module, item) {
    item.active = card.querySelector('.f-active').checked;
    if (module === 'odontologia') {
      item.date = clean(card.querySelector('.f-date').value);
      item.common = Math.max(0, Math.floor(Number(card.querySelector('.f-common').value) || 0));
      item.emergency = Math.max(0, Math.floor(Number(card.querySelector('.f-emergency').value) || 0));
      if (!item.active) {
        item.common = 0;
        item.emergency = 0;
      }
    } else if (module === 'enfermeira') {
      item.icon = clean(card.querySelector('.f-icon').value);
      item.service = clean(card.querySelector('.f-service').value);
    } else {
      item.closeAtNoon = card.querySelector('.f-noon').checked;
      item.date = clean(card.querySelector('.f-date').value);
      item.time = clean(card.querySelector('.f-time').value);
      item.status = card.querySelector('.f-status').value;
      item.message = clean(card.querySelector('.f-message').value);
    }
    return item;
  }

  function reflectCard(card, item) {
    card.classList.toggle('active-day', !!item.active);
    card.classList.toggle('inactive-day', !item.active);
    card.querySelector('.state-pill').textContent = item.active ? 'ATIVO NO PORTAL' : 'DESATIVADO';
  }

  function renderWeek(module) {
    var box = id(module + 'Week');
    if (!box) return;
    box.innerHTML = state[module].map(function (item, index) {
      return dayCard(module, item, index);
    }).join('');

    box.querySelectorAll('.day-card').forEach(function (card) {
      var index = Number(card.dataset.index);
      var item = state[module][index];

      card.querySelectorAll('input,select').forEach(function (field) {
        field.addEventListener('change', function () {
          readDay(card, module, item);
          reflectCard(card, item);
        });
      });

      card.querySelector('.b-publish').addEventListener('click', function () {
        readDay(card, module, item);
        item.active = true;
        card.querySelector('.f-active').checked = true;
        reflectCard(card, item);
        publishDay(module, index, card.querySelector('.day-status'));
      });

      card.querySelector('.b-cancel').addEventListener('click', function () {
        readDay(card, module, item);
        item.active = false;
        card.querySelector('.f-active').checked = false;
        if (module === 'odontologia') {
          item.common = 0;
          item.emergency = 0;
          card.querySelector('.f-common').value = '0';
          card.querySelector('.f-emergency').value = '0';
        }
        reflectCard(card, item);
        cancelDay(module, index, card.querySelector('.day-status'));
      });
    });
    if (refreshing) {
      box.querySelectorAll('.b-publish,.b-cancel').forEach(function (button) {
        button.disabled = true;
      });
    }
  }

  function disableMutations(disabled) {
    document
      .querySelectorAll(
        '.b-publish,.b-cancel,#publishRecado,#cancelRecado,#publishCampaign,#cancelCampaign'
      )
      .forEach(function (button) {
        button.disabled = disabled;
      });
  }

  function normalizedProfessional(item) {
    return {
      day: clean(item.day),
      active: item.active === true,
      date: clean(item.date),
      time: clean(item.time),
      status: clean(item.status),
      message: clean(item.message || item.service),
      closeAtNoon: item.closeAtNoon === true
    };
  }

  function professionalMatches(expected, actual) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every(function (item) {
      var wanted = normalizedProfessional(item);
      var found = actual.find(function (candidate) {
        return clean(candidate.day) === wanted.day;
      });
      if (!found) return false;
      var got = normalizedProfessional(found);
      return (
        wanted.active === got.active &&
        wanted.date === got.date &&
        wanted.time === got.time &&
        wanted.status === got.status &&
        wanted.message === got.message &&
        wanted.closeAtNoon === got.closeAtNoon
      );
    });
  }

  function nursePayload() {
    return state.enfermeira.map(function (item) {
      return {
        day: clean(item.day),
        service: clean(item.service),
        icon: clean(item.icon),
        available: item.active === true
      };
    });
  }

  function nurseMatches(expected, actual) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every(function (item) {
      var found = actual.find(function (candidate) {
        return clean(candidate.day) === clean(item.day);
      });
      return (
        !!found &&
        clean(found.service) === clean(item.service) &&
        clean(found.icon) === clean(item.icon) &&
        (found.available === true) === (item.available === true)
      );
    });
  }

  function dentalPayload() {
    return state.odontologia
      .filter(function (item) {
        return clean(item.date);
      })
      .map(function (item) {
        return {
          data: clean(item.date),
          dia: clean(item.day),
          vagasComuns: item.active ? Number(item.common || 0) : 0,
          vagasEmergenciais: item.active ? Number(item.emergency || 0) : 0
        };
      })
      .sort(function (left, right) {
        return left.data.localeCompare(right.data);
      });
  }

  function dentalMatches(expected, actual) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every(function (item) {
      var found = actual.find(function (candidate) {
        return clean(candidate.data) === clean(item.data);
      });
      return (
        !!found &&
        Number(found.vagasComuns) === Number(item.vagasComuns) &&
        Number(found.vagasEmergenciais) === Number(item.vagasEmergenciais)
      );
    });
  }

  function refreshMirror() {
    var frame = id('portalMirror');
    if (frame) frame.src = 'index.html?v=20260730-51&espelho=' + Date.now();
  }

  function saveProfessional(module, box) {
    var expected = state[module].map(normalizedProfessional);
    return postForm(MAIN, {
      action: 'salvar_modulo',
      adminKey: savedKey(),
      payload: JSON.stringify({module: module, days: expected})
    }).then(function () {
      return jsonp(MAIN, 'painel_publico');
    }).then(function (data) {
      var actual = data.modules && data.modules[module];
      if (!professionalMatches(expected, actual)) {
        throw new Error('O servidor gravou, mas a leitura de conferência não coincide com o painel.');
      }
      status(box, 'Publicado, relido e confirmado no Portal do Morador.', 'success');
      refreshMirror();
    });
  }

  function saveNurse(box) {
    var expected = nursePayload();
    return postForm(MAIN, {
      action: 'salvar_agenda_enfermeira',
      adminKey: savedKey(),
      payload: JSON.stringify({dias: expected})
    }).then(function () {
      return jsonp(MAIN, 'agenda_enfermeira');
    }).then(function (data) {
      if (!nurseMatches(expected, data.dias)) {
        throw new Error('A agenda foi gravada, mas a leitura de conferência não coincide.');
      }
      status(box, 'Agenda da enfermeira publicada, relida e confirmada.', 'success');
      refreshMirror();
    });
  }

  function saveDental(box) {
    var expected = dentalPayload();
    if (!expected.length) {
      status(box, 'Informe ao menos uma data de segunda, terça ou quinta-feira.', 'error');
      return Promise.reject(new Error('Agenda odontológica sem datas.'));
    }

    return postForm(DENTAL, {
      action: 'salvar_agenda',
      adminKey: savedKey(),
      payload: JSON.stringify({dias: expected})
    }).then(function () {
      return jsonp(DENTAL, 'agenda');
    }).then(function (data) {
      if (!dentalMatches(expected, data.dias)) {
        throw new Error('As vagas foram gravadas, mas a leitura de conferência não coincide.');
      }
      status(box, 'Vagas odontológicas publicadas, relidas e confirmadas.', 'success');
      refreshMirror();
    });
  }

  function publishDay(module, index, box) {
    status(box, 'Enviando e conferindo no servidor...', 'warning');
    var operation =
      module === 'enfermeira' ? saveNurse(box) :
      module === 'odontologia' ? saveDental(box) :
      saveProfessional(module, box);
    operation.catch(function (error) {
      status(box, 'Não confirmado: ' + error.message, 'error');
    });
  }

  function cancelDay(module, index, box) {
    status(box, 'Retirando e conferindo no servidor...', 'warning');
    var operation =
      module === 'enfermeira' ? saveNurse(box) :
      module === 'odontologia' ? saveDental(box) :
      saveProfessional(module, box);
    operation.then(function () {
      status(box, 'Retirado do portal e confirmado pela leitura do servidor.', 'success');
    }).catch(function (error) {
      status(box, 'Retirada não confirmada: ' + error.message, 'error');
    });
  }

  function mergeProfessional(module, rows) {
    state[module] = DAYS.map(function (day) {
      var current = state[module].find(function (item) {
        return item.day === day;
      }) || {};
      var received = (rows || []).find(function (item) {
        return clean(item.day) === day;
      });
      if (!received) return current;
      return {
        day: day,
        active: received.active === true,
        date: clean(received.date),
        time: clean(received.time),
        status: clean(received.status) || 'aguardando',
        message: clean(received.message || received.service),
        closeAtNoon: received.closeAtNoon === true
      };
    });
    renderWeek(module);
  }

  function loadPublic() {
    return jsonp(MAIN, 'painel_publico').then(function (data) {
      var modules = data.modules || {};
      mergeProfessional('medica', modules.medica);
      mergeProfessional('nutricionista', modules.nutricionista);
      return data;
    });
  }

  function loadNurse() {
    return jsonp(MAIN, 'agenda_enfermeira').then(function (data) {
      if (!Array.isArray(data.dias)) throw new Error('Agenda da enfermeira inválida.');
      state.enfermeira = DAYS.map(function (day) {
        var item = data.dias.find(function (candidate) {
          return clean(candidate.day) === day;
        }) || {};
        return {
          day: day,
          active: item.available === true,
          service: clean(item.service),
          icon: clean(item.icon)
        };
      });
      renderWeek('enfermeira');
    });
  }

  function loadDental() {
    return jsonp(DENTAL, 'agenda').then(function (data) {
      var rows = Array.isArray(data.dias) ? data.dias : [];
      state.odontologia = rows
        .filter(function (item) {
          return DENTAL_DAYS.indexOf(clean(item.dia)) >= 0;
        })
        .map(function (item) {
          var common = Number(item.vagasComuns || 0);
          var emergency = Number(item.vagasEmergenciais || 0);
          return {
            day: clean(item.dia),
            active: common > 0 || emergency > 0,
            date: clean(item.data),
            common: common,
            emergency: emergency
          };
        });
      if (!state.odontologia.length) state.odontologia = defaultDental();
      renderWeek('odontologia');
    }).catch(function (error) {
      state.odontologia = defaultDental();
      renderWeek('odontologia');
      throw error;
    });
  }

  function verifyItem(kind, item) {
    return jsonp(MAIN, 'painel_publico').then(function (data) {
      var list = kind === 'recado' ? data.recados : data.campanhas;
      var found = Array.isArray(list) && list.some(function (candidate) {
        return clean(candidate.id) === clean(item.id);
      });
      if (!found) throw new Error('A publicação não apareceu na leitura pública.');
    });
  }

  function publishRecado() {
    var title = clean(id('recadoTitle').value);
    var message = clean(id('recadoMessage').value);
    if (!title && !message) {
      status('recadoStatus', 'Digite o título ou a mensagem.', 'error');
      return;
    }
    var item = {
      id: 'recado-' + Date.now(),
      title: title,
      message: message,
      validity: id('recadoValidity').value,
      priority: id('recadoPriority').value,
      active: true
    };
    status('recadoStatus', 'Publicando e conferindo...', 'warning');
    postForm(MAIN, {
      action: 'salvar_recado',
      adminKey: savedKey(),
      payload: JSON.stringify(item)
    }).then(function () {
      return verifyItem('recado', item);
    }).then(function () {
      status('recadoStatus', 'Recado publicado, relido e confirmado.', 'success');
      refreshMirror();
    }).catch(function (error) {
      status('recadoStatus', 'Recado não confirmado: ' + error.message, 'error');
    });
  }

  function cancelRecado() {
    status('recadoStatus', 'Retirando e conferindo...', 'warning');
    postForm(MAIN, {
      action: 'cancelar_recados',
      adminKey: savedKey(),
      payload: '{}'
    }).then(function () {
      return jsonp(MAIN, 'painel_publico');
    }).then(function (data) {
      if (Array.isArray(data.recados) && data.recados.length) {
        throw new Error('Ainda existem recados ativos na leitura pública.');
      }
      id('recadoTitle').value = '';
      id('recadoMessage').value = '';
      status('recadoStatus', 'Todos os recados foram retirados e a leitura confirmou.', 'success');
      refreshMirror();
    }).catch(function (error) {
      status('recadoStatus', 'Retirada não confirmada: ' + error.message, 'error');
    });
  }

  function publishCampaign() {
    var item = {
      id: 'campanha-' + Date.now(),
      title: clean(id('campaignTitle').value),
      message: clean(id('campaignMessage').value),
      start: id('campaignStart').value,
      days: Math.max(1, Number(id('campaignDays').value) || 1),
      active: true
    };
    if (!item.title) {
      status('campaignStatus', 'Digite o nome da campanha.', 'error');
      return;
    }
    status('campaignStatus', 'Publicando e conferindo...', 'warning');
    postForm(MAIN, {
      action: 'salvar_campanha',
      adminKey: savedKey(),
      payload: JSON.stringify(item)
    }).then(function () {
      if (item.start && item.start > localToday()) {
        status(
          'campaignStatus',
          'Campanha agendada e confirmada pelo servidor. Ela aparecerá no portal em ' +
            formatBrazilianDate(item.start) + '.',
          'success'
        );
        refreshMirror();
        return null;
      }
      return verifyItem('campanha', item);
    }).then(function (verification) {
      if (verification === null) return;
      status('campaignStatus', 'Campanha publicada, relida e confirmada.', 'success');
      refreshMirror();
    }).catch(function (error) {
      status('campaignStatus', 'Campanha não confirmada: ' + error.message, 'error');
    });
  }

  function localToday() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) {
      if (part.type !== 'literal') values[part.type] = part.value;
    });
    return values.year + '-' + values.month + '-' + values.day;
  }

  function formatBrazilianDate(value) {
    var parts = clean(value).split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : clean(value);
  }

  function cancelCampaign() {
    status('campaignStatus', 'Retirando e conferindo...', 'warning');
    postForm(MAIN, {
      action: 'cancelar_campanhas',
      adminKey: savedKey(),
      payload: '{}'
    }).then(function () {
      return jsonp(MAIN, 'painel_publico');
    }).then(function (data) {
      if (Array.isArray(data.campanhas) && data.campanhas.length) {
        throw new Error('Ainda existem campanhas ativas na leitura pública.');
      }
      status('campaignStatus', 'Todas as campanhas foram retiradas e a leitura confirmou.', 'success');
      refreshMirror();
    }).catch(function (error) {
      status('campaignStatus', 'Retirada não confirmada: ' + error.message, 'error');
    });
  }

  function security() {
    var input = id('adminKeyInput');
    input.value = savedKey();
    id('saveAdminKey').addEventListener('click', function () {
      var value = clean(input.value);
      if (value.length < 6) {
        id('securityStatus').textContent = 'A chave precisa ter pelo menos 6 caracteres.';
        return;
      }
      try {
        localStorage.setItem(KEY, value);
        sessionStorage.setItem(KEY, value);
      } catch (ignore) {}
      id('securityStatus').textContent = 'Chave salva neste aparelho.';
    });
    id('clearAdminKey').addEventListener('click', function () {
      try {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
      } catch (ignore) {}
      input.value = '';
      id('securityStatus').textContent = 'Chave apagada deste aparelho.';
    });
  }

  function refreshAll() {
    var button = id('refreshAll');
    refreshing = true;
    disableMutations(true);
    button.disabled = true;
    button.textContent = '↻ Conferindo servidores...';
    Promise.allSettled([loadPublic(), loadNurse(), loadDental()]).then(function (results) {
      var failed = results.filter(function (result) {
        return result.status === 'rejected';
      });
      refreshing = false;
      disableMutations(false);
      button.disabled = false;
      button.textContent = failed.length ? '⚠ Atualizar novamente' : '✓ Dados conferidos';
      refreshMirror();
      setTimeout(function () {
        button.textContent = '↻ Atualizar todos os dados';
      }, 3500);
    });
  }

  function init() {
    bindTabs();
    security();
    renderWeek('medica');
    renderWeek('nutricionista');
    renderWeek('enfermeira');
    renderWeek('odontologia');
    id('publishRecado').addEventListener('click', publishRecado);
    id('cancelRecado').addEventListener('click', cancelRecado);
    id('publishCampaign').addEventListener('click', publishCampaign);
    id('cancelCampaign').addEventListener('click', cancelCampaign);
    id('refreshMirror').addEventListener('click', refreshMirror);
    id('refreshAll').addEventListener('click', refreshAll);
    id('campaignStart').value = new Date().toISOString().slice(0, 10);
    tab('recados');
    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
