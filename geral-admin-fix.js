(function () {
  'use strict';

  var DENTAL_API = String(window.DENTAL_AGENDA_API_URL || '').trim();
  var DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  var STORAGE_KEY = 'tacs-admin-key';
  var syncing = false;

  function id(value) {
    return document.getElementById(value);
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function esc(value) {
    return clean(value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function pin() {
    try {
      return clean(sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return '';
    }
  }

  function status(card, message, type) {
    var box = card && card.querySelector('.day-status');
    if (!box) return;
    box.textContent = message;
    box.className = 'status day-status' + (type ? ' ' + type : '');
  }

  function setCardState(card, active) {
    card.classList.toggle('active-day', active);
    card.classList.toggle('inactive-day', !active);
    var pill = card.querySelector('.state-pill');
    if (pill) pill.textContent = active ? 'ATIVO NO PORTAL' : 'DESATIVADO';
    var checkbox = card.querySelector('.f-active');
    if (checkbox) checkbox.checked = active;
  }

  function emptyDentalCard(day) {
    var extra = day === 'Sexta-feira' ? ' • DIA EXTRA' : '';
    return '<article class="day-card inactive-day" data-unified-dental="1" data-day="' + esc(day) + '">' +
      '<div class="day-title"><strong>' + esc(day) + extra + '</strong><span class="state-pill">DESATIVADO</span></div>' +
      '<div class="day-controls">' +
      '<div class="switch-row"><label><input class="f-active" type="checkbox"> Disponibilizar vagas nesta data</label></div>' +
      '<label>Data<input class="f-date" type="date" value=""></label>' +
      '<label>Vagas comuns<input class="f-common" type="number" min="0" step="1" value="0"></label>' +
      '<label>Vagas emergenciais<input class="f-emergency" type="number" min="0" step="1" value="0"></label>' +
      '</div><div class="day-actions">' +
      '<button class="btn publish b-publish" type="button">Publicar e conferir</button>' +
      '<button class="btn cancel b-cancel" type="button">Retirar do portal</button>' +
      '</div><div class="status day-status">Edite os dados e publique este dia.</div></article>';
  }

  function normalizedDayName(card) {
    var strong = card.querySelector('.day-title strong');
    return clean(strong && strong.textContent).replace(/\s*•\s*DIA EXTRA\s*$/i, '');
  }

  function ensureDentalFiveDays() {
    var box = id('odontologiaWeek');
    if (!box || syncing) return;

    var existing = {};
    box.querySelectorAll('.day-card').forEach(function (card) {
      var day = normalizedDayName(card);
      if (day) {
        existing[day] = card;
        card.dataset.unifiedDental = '1';
        card.dataset.day = day;
        var title = card.querySelector('.day-title strong');
        if (title && day === 'Sexta-feira' && title.textContent.indexOf('DIA EXTRA') === -1) {
          title.textContent = day + ' • DIA EXTRA';
        }
      }
    });

    DAYS.forEach(function (day) {
      if (existing[day]) return;
      box.insertAdjacentHTML('beforeend', emptyDentalCard(day));
    });

    var ordered = {};
    box.querySelectorAll('.day-card').forEach(function (card) {
      ordered[normalizedDayName(card)] = card;
    });
    DAYS.forEach(function (day) {
      if (ordered[day]) box.appendChild(ordered[day]);
    });

    box.querySelectorAll('.day-card').forEach(function (card) {
      if (card.dataset.unifiedBound === '1') return;
      card.dataset.unifiedBound = '1';
      var active = card.querySelector('.f-active');
      if (active) {
        active.addEventListener('change', function () {
          setCardState(card, active.checked);
        });
      }
    });
  }

  function collectDentalRows() {
    var box = id('odontologiaWeek');
    var rows = [];
    var invalid = [];

    DAYS.forEach(function (day) {
      var card = Array.prototype.find.call(box.querySelectorAll('.day-card'), function (candidate) {
        return normalizedDayName(candidate) === day;
      });
      if (!card) return;

      var active = Boolean(card.querySelector('.f-active') && card.querySelector('.f-active').checked);
      var date = clean(card.querySelector('.f-date') && card.querySelector('.f-date').value);
      var common = Math.max(0, Math.floor(Number(card.querySelector('.f-common') && card.querySelector('.f-common').value) || 0));
      var emergency = Math.max(0, Math.floor(Number(card.querySelector('.f-emergency') && card.querySelector('.f-emergency').value) || 0));

      if (active && !date) invalid.push(day);
      if (!date) return;

      rows.push({
        data: date,
        dia: day,
        vagasComuns: active ? common : 0,
        vagasEmergenciais: active ? emergency : 0,
        diaExtra: day === 'Sexta-feira'
      });
    });

    if (invalid.length) {
      throw new Error('Informe a data antes de ativar: ' + invalid.join(', ') + '.');
    }
    if (!rows.length) {
      throw new Error('Informe ao menos uma data entre segunda e sexta-feira.');
    }
    return rows;
  }

  function postDental(rows) {
    return new Promise(function (resolve, reject) {
      if (!DENTAL_API) {
        reject(new Error('Agenda odontológica não configurada.'));
        return;
      }
      if (!pin()) {
        reject(new Error('Sessão sem PIN. Saia do modo administrador e entre novamente.'));
        return;
      }

      var nonce = 'portal-geral-dental-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      var iframe = document.createElement('iframe');
      var form = document.createElement('form');
      var done = false;
      var timer;
      iframe.name = 'portalGeralDental' + Date.now();
      iframe.hidden = true;
      form.method = 'post';
      form.action = DENTAL_API;
      form.target = iframe.name;
      form.hidden = true;

      function add(name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value == null ? '' : value);
        form.appendChild(input);
      }

      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        if (form.parentNode) form.remove();
        setTimeout(function () { if (iframe.parentNode) iframe.remove(); }, 250);
      }

      function finish(error, result) {
        if (done) return;
        done = true;
        cleanup();
        if (error) reject(error);
        else resolve(result);
      }

      function receive(event) {
        if (event.source !== iframe.contentWindow) return;
        var data = event.data;
        if (!data || typeof data !== 'object') return;
        var result = data.result || data;
        var receivedNonce = clean(data.nonce || result.nonce);
        if (data.source !== 'agenda-odontologica-tacs' || receivedNonce !== nonce) return;
        if (result.ok === false || data.ok === false) {
          finish(new Error(result.message || data.message || 'O servidor recusou a gravação.'));
          return;
        }
        finish(null, result);
      }

      add('action', 'salvar_agenda');
      add('adminKey', pin());
      add('payload', JSON.stringify({ dias: rows }));
      add('nonce', nonce);
      window.addEventListener('message', receive);
      document.body.append(iframe, form);
      timer = setTimeout(function () {
        finish(new Error('O servidor odontológico não confirmou a gravação.'));
      }, 22000);
      form.submit();
    });
  }

  function saveDental(clickedCard, activate) {
    try {
      if (activate) {
        setCardState(clickedCard, true);
      } else {
        setCardState(clickedCard, false);
        var common = clickedCard.querySelector('.f-common');
        var emergency = clickedCard.querySelector('.f-emergency');
        if (common) common.value = '0';
        if (emergency) emergency.value = '0';
      }

      var rows = collectDentalRows();
      id('odontologiaWeek').querySelectorAll('.day-status').forEach(function (box) {
        box.textContent = 'Enviando e conferindo no servidor...';
        box.className = 'status day-status warning';
      });

      postDental(rows).then(function () {
        id('odontologiaWeek').querySelectorAll('.day-card').forEach(function (card) {
          status(card, 'Agenda publicada e confirmada pelo servidor.', 'success');
        });
        var mirror = id('portalMirror');
        if (mirror) mirror.src = 'index.html?v=20260731-70&espelho=' + Date.now();
      }).catch(function (error) {
        status(clickedCard, 'Não confirmado: ' + error.message, 'error');
      });
    } catch (error) {
      status(clickedCard, error.message, 'error');
    }
  }

  function interceptDentalButtons() {
    var box = id('odontologiaWeek');
    if (!box || box.dataset.unifiedCapture === '1') return;
    box.dataset.unifiedCapture = '1';
    box.addEventListener('click', function (event) {
      var button = event.target.closest('.b-publish,.b-cancel');
      if (!button || !box.contains(button)) return;
      var card = button.closest('.day-card');
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      saveDental(card, button.classList.contains('b-publish'));
    }, true);
  }

  function enforcePin() {
    if (pin()) return;
    document.querySelectorAll('.b-publish,.b-cancel,#publishRecado,#cancelRecado,#publishCampaign,#cancelCampaign').forEach(function (button) {
      button.disabled = true;
      button.title = 'Entre novamente pelo Portal Geral e informe o PIN.';
    });
    var hero = document.querySelector('.unified-note');
    if (hero) hero.textContent = 'Sessão sem PIN. Feche esta tela e entre novamente pela Área do administrador.';
  }

  function install() {
    enforcePin();
    var box = id('odontologiaWeek');
    if (!box) return;
    ensureDentalFiveDays();
    interceptDentalButtons();

    var observer = new MutationObserver(function () {
      ensureDentalFiveDays();
      interceptDentalButtons();
    });
    observer.observe(box, { childList: true, subtree: true });

    setTimeout(ensureDentalFiveDays, 500);
    setTimeout(ensureDentalFiveDays, 1600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
