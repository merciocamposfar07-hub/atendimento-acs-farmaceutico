const fs = require('fs');

function replaceOnce(text, pattern, replacement, label) {
  const next = typeof pattern === 'string'
    ? text.replace(pattern, replacement)
    : text.replace(pattern, replacement);
  if (next === text) throw new Error(label + ' não localizado.');
  return next;
}

const dentalPath = 'portal-odontologia-segunda-sexta.js';
let dental = fs.readFileSync(dentalPath, 'utf8');

if (!dental.includes('var reservationPending = false;')) {
  dental = replaceOnce(
    dental,
    "  var requestCode = '';",
    "  var requestCode = '';\n  var reservationPending = false;",
    'Estado de reserva'
  );
}

dental = replaceOnce(
  dental,
  "        button.disabled = value === null || value <= 0;",
  "        var sameReserved = Boolean(selected && selected.reserved && selected.id === slot.id && selected.type === type);\n        button.disabled = reservationPending || value === null || value <= 0 || Boolean(selected && selected.reserved && !sameReserved);",
  'Bloqueio dos botões odontológicos'
);

const oldStatus = `    status.className = 'dental-status';
    if (loading) status.textContent = 'Atualizando a agenda odontológica pela planilha...';
    else if (!slots.length) {
      status.textContent = 'Nenhum dia está publicado na planilha odontológica.';
      status.classList.add('error');
    } else if (selected) {
      status.textContent = 'Selecionado: ' + selected.day + ' — vaga ' + (selected.type === 'emergencial' ? 'de emergência' : 'comum') + '.';
    } else status.textContent = 'Toque na vaga comum ou na vaga de emergência do dia desejado.';`;

const newStatus = `    status.className = 'dental-status';
    if (loading) status.textContent = 'Atualizando a agenda odontológica pela planilha...';
    else if (reservationPending && selected) status.textContent = 'Reservando a vaga escolhida e atualizando a quantidade...';
    else if (!slots.length) {
      status.textContent = 'Nenhum dia está publicado na planilha odontológica.';
      status.classList.add('error');
    } else if (selected && selected.reserved) {
      status.textContent = 'Vaga reservada. A quantidade foi atualizada automaticamente. Agora envie sua solicitação pelo WhatsApp.';
    } else if (selected) {
      status.textContent = 'Selecionado: ' + selected.day + ' — vaga ' + (selected.type === 'emergencial' ? 'de emergência' : 'comum') + '.';
    } else status.textContent = 'Toque na vaga comum ou na vaga de emergência do dia desejado.';`;

dental = replaceOnce(dental, oldStatus, newStatus, 'Status odontológico');

const selectPattern = /  function selectSlot\(button\) \{[\s\S]*?\n  \}\n\n  function validCpf/;
const selectReplacement = `  function selectSlot(button) {
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

  function validCpf`;

dental = replaceOnce(dental, selectPattern, selectReplacement, 'Função selectSlot');

dental = replaceOnce(
  dental,
  "    if (send && isDental()) send.disabled = !formReady();",
  "    if (send && isDental()) send.disabled = reservationPending || !formReady();",
  'Função refreshSend'
);

const sendPattern = /  function sendDental\(event\) \{[\s\S]*?\n  \}\n\n  function professionalDescription/;
const sendReplacement = `  function sendDental(event) {
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

  function professionalDescription`;

dental = replaceOnce(dental, sendPattern, sendReplacement, 'Função sendDental');
fs.writeFileSync(dentalPath, dental, 'utf8');

const configPath = 'agenda-config.js';
let config = fs.readFileSync(configPath, 'utf8');

if (!config.includes('function installPortalContrast()')) {
  const contrastFunction = `
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
`;
  config = replaceOnce(config, '  function installOfflineBanner() {', contrastFunction + '\n  function installOfflineBanner() {', 'Âncora de contraste');
}

if (!config.includes('    installPortalContrast();')) {
  config = replaceOnce(
    config,
    '  function init() {\n    installOfflineBanner();',
    '  function init() {\n    installPortalContrast();\n    installOfflineBanner();',
    'Inicialização do contraste'
  );
}
fs.writeFileSync(configPath, config, 'utf8');

const indexPath = 'index.html';
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/agenda-config\.js\?v=[^"']+/, 'agenda-config.js?v=20260811-contraste-petroleo-v1');
index = index.replace(/portal-odontologia-segunda-sexta\.js\?v=[^"']+/, 'portal-odontologia-segunda-sexta.js?v=20260811-reserva-clique-v96');
fs.writeFileSync(indexPath, index, 'utf8');

console.log('Patch v96 aplicado.');
