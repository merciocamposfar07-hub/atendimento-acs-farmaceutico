(function () {
  'use strict';

  var CATEGORY = 'Atendimento com a Enfermeira Chefe';
  var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var DEFAULT = [
    { day: 'Segunda-feira', service: 'Visita', icon: '🏠', available: true },
    { day: 'Terça-feira', service: 'Pré-natal', icon: '🤰', available: true },
    { day: 'Quarta-feira', service: 'Folga', icon: '❌', available: false },
    { day: 'Quinta-feira', service: 'Puericultura - acompanhamento de crianças e adolescentes', icon: '👶', available: true },
    { day: 'Sexta-feira', service: 'Preventivo', icon: '🌸', available: true }
  ];
  var schedule = DEFAULT.slice();

  function style() {
    if (document.getElementById('nurse-agenda-style')) return;
    var s = document.createElement('style');
    s.id = 'nurse-agenda-style';
    s.textContent = '.nurse-agenda{padding:24px;border:2px solid #0D5F8A;border-radius:20px;background:linear-gradient(145deg,#041F34,#062C46 58%,#0A4265);color:#fff;box-shadow:0 18px 34px rgba(3,35,56,.22)}.nurse-agenda small{display:block;color:#70E39F;font-size:16px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.nurse-agenda h3{margin:10px 0 8px;color:#fff;font-size:clamp(31px,5vw,42px)}.nurse-agenda>p{font-size:19px;line-height:1.5}.nurse-days{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.nurse-day{min-height:118px;padding:17px;border:2px solid #6E9DB5;border-radius:16px;background:#fff;color:#102B3C;text-align:left}.nurse-day strong,.nurse-day span,.nurse-day b{display:block}.nurse-day strong{font-size:21px}.nurse-day span{margin-top:5px;font-size:24px}.nurse-day b{margin-top:6px;color:#06763A;font-size:18px}.nurse-day.selected{border-color:#16A85D;background:#ECF9F1;box-shadow:0 0 0 4px rgba(22,168,93,.22)}.nurse-day:disabled{opacity:.72;background:#EEF3F5}.nurse-status{margin:17px 0 0;padding-top:15px;border-top:1px solid #4C829D;font-size:18px;font-weight:800;line-height:1.5}footer.portal-footer-fixed{display:block!important;padding:22px 20px!important;text-align:center!important}footer.portal-footer-fixed div{border:0!important;padding:0!important}footer.portal-footer-fixed strong{display:block!important;font-size:17px!important}footer.portal-footer-fixed .portal-location{margin-top:4px!important;font-size:15px!important}footer.portal-footer-fixed .portal-rights{margin-top:17px!important;padding-top:15px!important;border-top:1px solid #7895a5!important;font-size:14px!important;font-weight:750!important}.id-cns-note{font-size:16px!important}.slot.closed-noon{opacity:.58!important;background:#e7ecef!important;pointer-events:none!important}.slot.closed-noon b{color:#718792!important}@media(max-width:720px){.nurse-agenda{padding:21px 17px}.nurse-days{grid-template-columns:1fr}.nurse-day{min-height:104px}}';
    document.head.appendChild(s);
  }

  function footer() {
    var f = document.querySelector('footer');
    if (!f) return;
    f.className = 'portal-footer-fixed';
    f.innerHTML = '<div><strong>Serviço TACS – Unidade de Saúde Posto Matias</strong><div class="portal-location">Sítio Japaranduba • Chã Grande/PE</div><div class="portal-rights">© 2026 Portal TACS. Todos os direitos reservados.</div></div>';
  }

  function clock() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var v = {};
    parts.forEach(function (x) { v[x.type] = x.value; });
    return { iso: v.year + '-' + v.month + '-' + v.day, br: v.day + '/' + v.month + '/' + v.year, minutes: Number(v.hour) * 60 + Number(v.minute) };
  }

  function removeNutrition() {
    var c = document.getElementById('category');
    if (!c) return;
    Array.prototype.slice.call(c.options).forEach(function (o) {
      if (String(o.textContent).toLowerCase().indexOf('nutricionista') !== -1) o.remove();
    });
  }

  function noticeDateStamp(text) {
    var match = String(text || '').match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
    if (!match) return NaN;
    return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  function expireNotices() {
    var c = clock();
    var a = document.getElementById('noticeArea');
    if (!a) return;
    var currentParts = c.iso.split('-');
    var todayStamp = Date.UTC(Number(currentParts[0]), Number(currentParts[1]) - 1, Number(currentParts[2]));
    Array.prototype.forEach.call(a.querySelectorAll('.notice-card'), function (card) {
      var text = String(card.textContent || '');
      var lower = text.toLowerCase();
      var stamp = noticeDateStamp(text);
      var expiredByDate = Number.isFinite(stamp) && (stamp < todayStamp || (stamp === todayStamp && c.minutes >= 720));
      var expiredTodayWord = /\bhoje\b/.test(lower) && c.minutes >= 720;
      if (expiredByDate || expiredTodayWord) card.remove();
    });
    var l = a.querySelector('.notice-list');
    if (l && !l.querySelector('.notice-card')) { a.innerHTML = ''; a.hidden = true; }
  }

  function expireDental() {
    var c = clock();
    if (c.minutes < 720) return;
    Array.prototype.forEach.call(document.querySelectorAll('.slot'), function (b) {
      if (b.classList.contains('closed-noon')) return;
      var span = b.querySelector('span');
      if (!span || String(span.textContent || '').trim() !== c.br) return;
      b.disabled = true;
      b.classList.add('closed-noon');
      var x = b.querySelector('b');
      if (x) x.textContent = 'Vagas encerradas às 12h';
    });
  }

  function observeExpiry() {
    var a = document.getElementById('noticeArea');
    var d = document.getElementById('dentalSlots');
    if (a) new MutationObserver(function () { window.requestAnimationFrame(expireNotices); }).observe(a, { childList: true, subtree: true });
    if (d) new MutationObserver(function () { window.requestAnimationFrame(expireDental); }).observe(d, { childList: true, subtree: true });
    expireNotices();
    expireDental();
    setInterval(function () { expireNotices(); expireDental(); }, 30000);
  }

  function load(done) {
    var cb = 'tacsNurse' + Date.now();
    var s = document.createElement('script');
    var finished = false;
    var t = setTimeout(function () { finish(); }, 9000);
    function finish(data) {
      if (finished) return;
      finished = true;
      clearTimeout(t);
      delete window[cb];
      if (s.parentNode) s.remove();
      if (data && data.ok !== false && Array.isArray(data.dias) && data.dias.length) schedule = data.dias;
      done(data);
    }
    window[cb] = finish;
    s.onerror = function () { finish(); };
    s.src = API + '?action=agenda_enfermeira&callback=' + encodeURIComponent(cb) + '&v=' + Date.now();
    document.head.appendChild(s);
  }

  function nurse() {
    var c = document.getElementById('category');
    var d = document.getElementById('dentalSchedule');
    var sub = document.getElementById('subject');
    var field = document.getElementById('subjectField');
    if (!c || !d || !sub || !field || document.getElementById('nurseSchedule')) return;
    var o = document.createElement('option');
    o.value = CATEGORY;
    o.textContent = CATEGORY;
    var first = Array.prototype.find.call(c.options, function (x) { return x.value.indexOf('odontológico') !== -1; });
    c.insertBefore(o, first || null);
    var sec = document.createElement('section');
    sec.className = 'nurse-agenda full';
    sec.id = 'nurseSchedule';
    sec.hidden = true;
    sec.innerHTML = '<small>Agenda da Enfermeira Chefe</small><h3>Escolha o atendimento</h3><p>Toque no dia correspondente ao atendimento que você precisa.</p><div class="nurse-days" id="nurseDays"></div><p class="nurse-status" id="nurseStatus">Carregando a programação vigente...</p>';
    d.parentNode.insertBefore(sec, d.nextSibling);
    var list = document.getElementById('nurseDays');
    var st = document.getElementById('nurseStatus');
    function render() {
      list.innerHTML = '';
      schedule.forEach(function (item) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'nurse-day';
        b.disabled = !item.available;
        b.innerHTML = '<strong>' + item.day + '</strong><span>' + (item.icon || '') + '</span><b>' + item.service + '</b>';
        b.onclick = function () {
          Array.prototype.forEach.call(list.querySelectorAll('.nurse-day'), function (x) { x.classList.remove('selected'); });
          b.classList.add('selected');
          sub.value = 'Atendimento com a Enfermeira Chefe - ' + item.day + ': ' + item.service;
          sub.dispatchEvent(new Event('input', { bubbles: true }));
          st.textContent = 'Selecionado: ' + item.day + ' - ' + item.service + '.';
        };
        list.appendChild(b);
      });
      st.textContent = 'Programação vigente da Unidade de Saúde.';
    }
    function update() {
      var active = c.value === CATEGORY;
      sec.hidden = !active;
      if (active) {
        field.firstChild.textContent = 'Motivo do atendimento ';
        sub.placeholder = 'Explique resumidamente o motivo do atendimento';
      } else if (sub.value.indexOf('Atendimento com a Enfermeira Chefe - ') === 0) {
        sub.value = '';
        sub.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    c.addEventListener('change', update);
    render();
    update();
    load(function (data) {
      render();
      update();
      if (!data || data.ok === false) st.textContent = 'Programação padrão exibida. Não foi possível atualizar agora.';
    });
  }

  function loadResidentsAutofill() {
    if (document.querySelector('script[data-moradores-autofill]')) return;
    var script = document.createElement('script');
    script.src = 'moradores-autofill.js?v=20260728-03';
    script.dataset.moradoresAutofill = '1';
    document.head.appendChild(script);
  }

  function install() {
    footer();
    removeNutrition();
    observeExpiry();
    nurse();
    loadResidentsAutofill();
  }

  style();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());