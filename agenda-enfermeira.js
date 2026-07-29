(function () {
  'use strict';

  var CATEGORY = 'Atendimento com a Enfermeira Chefe';
  var DENTAL_REGULAR = 'Solicitar atendimento odontológico (dentista)';
  var DENTAL_EMERGENCY = 'Solicitar atendimento odontológico de emergência (dentista)';
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
    s.textContent = '.nurse-agenda,.dental-public{padding:24px;border:2px solid #0D5F8A;border-radius:20px;background:#eef7fb;color:#102b3c;box-shadow:0 14px 28px rgba(3,35,56,.14)}.nurse-agenda small,.dental-public small{display:block;color:#078b45;font-size:16px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.nurse-agenda h3,.dental-public h3{margin:10px 0 8px;color:#102b3c;font-size:clamp(29px,5vw,40px);line-height:1.08}.nurse-agenda>p,.dental-public>p{font-size:18px;line-height:1.45}.nurse-days,.dental-public-days{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.nurse-day,.dental-public-day{min-height:142px;padding:14px 12px;border:2px solid #9bb4c1;border-radius:15px;background:#fff;color:#102B3C;text-align:left}.nurse-day strong,.nurse-day span,.nurse-day b,.dental-public-day strong,.dental-public-day span,.dental-public-day b,.dental-public-day em{display:block}.nurse-day strong,.dental-public-day strong{font-size:18px;line-height:1.2}.nurse-day span{margin-top:7px;font-size:23px}.nurse-day b{margin-top:6px;color:#06763A;font-size:17px;line-height:1.25}.nurse-day.selected,.dental-public-day.selected{border-color:#0d5f8a;background:#e1f1f8;box-shadow:0 0 0 3px rgba(13,95,138,.15)}.nurse-day:disabled,.dental-public-day:disabled{opacity:.62;background:#e4eaed;cursor:not-allowed}.dental-public{margin-bottom:18px}.dental-public-day .date{margin-top:5px;color:#415b69;font-size:15px}.dental-public-day .extra{margin:7px 0 2px;color:#b05c00;font-size:14px;font-style:normal;font-weight:950}.dental-public-day .service{margin-top:7px;color:#123d57;font-size:16px}.dental-public-day .common{margin-top:8px;color:#06763a;font-size:16px}.dental-public-day .emergency{margin-top:7px;color:#a3302b;font-size:15px}.dental-public-day .closed{color:#667d89}.nurse-status,.dental-public-status{margin:17px 0 0;padding-top:15px;border-top:1px solid #86a7b7;font-size:17px;font-weight:800;line-height:1.45}footer.portal-footer-fixed{display:block!important;padding:22px 20px!important;text-align:center!important}footer.portal-footer-fixed div{border:0!important;padding:0!important}footer.portal-footer-fixed strong{display:block!important;font-size:17px!important}footer.portal-footer-fixed .portal-location{margin-top:4px!important;font-size:15px!important}footer.portal-footer-fixed .portal-rights{margin-top:17px!important;padding-top:15px!important;border-top:1px solid #7895a5!important;font-size:14px!important;font-weight:750!important}.id-cns-note{font-size:16px!important}.slot.closed-noon{opacity:.58!important;background:#e7ecef!important;pointer-events:none!important}.slot.closed-noon b{color:#718792!important}@media(max-width:720px){.nurse-agenda,.dental-public{padding:18px 14px}.nurse-days,.dental-public-days{grid-template-columns:repeat(5,minmax(112px,1fr));overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:6px}.nurse-day,.dental-public-day{min-height:150px;scroll-snap-align:start}.nurse-agenda h3,.dental-public h3{font-size:30px}.nurse-agenda>p,.dental-public>p{font-size:17px}}';
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
    Array.prototype.forEach.call(document.querySelectorAll('.slot,.dental-public-day'), function (b) {
      if (b.classList.contains('closed-noon')) return;
      var date = b.getAttribute('data-date');
      var span = b.querySelector('span');
      var sameDay = date === c.iso || (span && String(span.textContent || '').trim() === c.br);
      if (!sameDay) return;
      b.disabled = true;
      b.classList.add('closed-noon');
      var x = b.querySelector('.common') || b.querySelector('b');
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
          c.value = CATEGORY;
          c.dispatchEvent(new Event('change', { bubbles: true }));
          sub.value = 'Atendimento com a Enfermeira Chefe - ' + item.day + ': ' + item.service;
          sub.dispatchEvent(new Event('input', { bubbles: true }));
          field.scrollIntoView({ behavior: 'smooth', block: 'center' });
          st.textContent = 'Selecionado: ' + item.day + ' - ' + item.service + '.';
        };
        list.appendChild(b);
      });
      st.textContent = 'Programação vigente da Unidade de Saúde.';
    }
    render();
    load(function (data) {
      render();
      if (!data || data.ok === false) st.textContent = 'Programação padrão exibida. Não foi possível atualizar agora.';
    });
  }

  function dateBr(value) {
    var m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(value || '');
  }

  function countText(value, emergency) {
    if (value === null || value === '' || typeof value === 'undefined') return emergency ? '🚨 Emergência ainda não informada' : 'Vagas comuns ainda não informadas';
    var n = Math.max(0, Number(value) || 0);
    if (emergency) return n === 1 ? '🚨 1 vaga de emergência' : n > 1 ? '🚨 ' + n + ' vagas de emergência' : '🚨 Sem vaga de emergência';
    return n === 1 ? '1 vaga comum disponível' : n > 1 ? n + ' vagas comuns disponíveis' : 'Sem vagas comuns';
  }

  function dentalPublic() {
    var original = document.getElementById('dentalSchedule');
    var category = document.getElementById('category');
    var subject = document.getElementById('subject');
    if (!original || !category || !subject || document.getElementById('dentalPublicSchedule')) return;
    var api = String(window.DENTAL_AGENDA_API_URL || '').trim();
    var sec = document.createElement('section');
    sec.className = 'dental-public full';
    sec.id = 'dentalPublicSchedule';
    sec.innerHTML = '<small>Agenda odontológica da Unidade de Saúde</small><h3>Escolha o dia da consulta</h3><p>Os dias regulares são segunda, terça e quinta. Sexta-feira só aparece como <strong>DIA EXTRA</strong> quando estiver liberada no painel administrativo.</p><div class="dental-public-days" id="dentalPublicDays"></div><p class="dental-public-status" id="dentalPublicStatus">Carregando vagas...</p>';
    original.parentNode.insertBefore(sec, original);
    var list = document.getElementById('dentalPublicDays');
    var status = document.getElementById('dentalPublicStatus');

    function choose(slot, emergency, button) {
      category.value = emergency ? DENTAL_EMERGENCY : DENTAL_REGULAR;
      category.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(function () {
        var originals = document.querySelectorAll('#dentalSlots .slot');
        for (var i = 0; i < originals.length; i += 1) {
          var span = originals[i].querySelector('span');
          if (span && String(span.textContent || '').trim() === dateBr(slot.data)) {
            originals[i].click();
            break;
          }
        }
        Array.prototype.forEach.call(list.querySelectorAll('.dental-public-day'), function (x) { x.classList.remove('selected'); });
        button.classList.add('selected');
        subject.value = (emergency ? 'Solicitação de vaga odontológica de emergência' : 'Solicitação de atendimento odontológico') + ' - ' + slot.dia + ', ' + dateBr(slot.data);
        subject.dispatchEvent(new Event('input', { bubbles: true }));
        status.textContent = 'Selecionado: ' + slot.dia + ' — ' + dateBr(slot.data) + (emergency ? ' — vaga de emergência.' : ' — vaga comum.');
        document.getElementById('subjectField').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    }

    function render(data) {
      var days = data && Array.isArray(data.dias) ? data.dias : [];
      list.innerHTML = '';
      days.forEach(function (slot) {
        var common = slot.vagasComuns;
        var emergency = slot.vagasEmergenciais;
        var isFriday = /sexta/i.test(String(slot.dia || ''));
        var explicitlyExtra = slot.extra === true || slot.diaExtra === true || /extra/i.test(String(slot.tipo || '') + ' ' + String(slot.observacao || ''));
        if (isFriday && !explicitlyExtra && (common === null || common === '' || Number(common) <= 0) && (emergency === null || emergency === '' || Number(emergency) <= 0)) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dental-public-day';
        b.setAttribute('data-date', slot.data || '');
        var commonN = common === null || common === '' || typeof common === 'undefined' ? null : Math.max(0, Number(common) || 0);
        var emergencyN = emergency === null || emergency === '' || typeof emergency === 'undefined' ? null : Math.max(0, Number(emergency) || 0);
        var hasCommon = commonN !== null && commonN > 0;
        var hasEmergency = emergencyN !== null && emergencyN > 0;
        b.disabled = !hasCommon && !hasEmergency;
        b.innerHTML = '<strong>' + (slot.dia || '') + '</strong><span class="date">' + dateBr(slot.data) + '</span>' + (isFriday ? '<em class="extra">⭐ DIA EXTRA</em>' : '') + '<b class="service">🦷 Atendimento odontológico</b><b class="common ' + (hasCommon ? '' : 'closed') + '">' + countText(common, false) + '</b><b class="emergency ' + (hasEmergency ? '' : 'closed') + '">' + countText(emergency, true) + '</b>';
        b.onclick = function (event) {
          var emergencyLine = event.target && event.target.classList && event.target.classList.contains('emergency');
          choose(slot, emergencyLine && hasEmergency ? true : !hasCommon && hasEmergency, b);
        };
        list.appendChild(b);
      });
      if (!list.children.length) status.textContent = 'Nenhuma data odontológica está disponível no momento.';
      else status.textContent = 'Toque no dia desejado. Para emergência, toque diretamente na linha vermelha da vaga de emergência.';
      expireDental();
    }

    if (!api) { status.textContent = 'A agenda odontológica ainda não está conectada.'; return; }
    var cb = 'dentalPublic' + Date.now();
    var script = document.createElement('script');
    var timer = setTimeout(function () { cleanup(); status.textContent = 'Não foi possível carregar a agenda odontológica agora.'; }, 12000);
    function cleanup() { clearTimeout(timer); delete window[cb]; if (script.parentNode) script.remove(); }
    window[cb] = function (data) { cleanup(); if (data && data.ok !== false) render(data); else status.textContent = 'Não foi possível carregar a agenda odontológica agora.'; };
    script.onerror = function () { cleanup(); status.textContent = 'Não foi possível carregar a agenda odontológica agora.'; };
    script.src = api + (api.indexOf('?') === -1 ? '?' : '&') + 'action=agenda&callback=' + encodeURIComponent(cb) + '&v=' + Date.now();
    document.head.appendChild(script);
  }

  function loadResidentsAutofill() {
    if (document.querySelector('script[data-moradores-autofill]')) return;
    var script = document.createElement('script');
    script.src = 'moradores-autofill.js?v=20260728-04';
    script.dataset.moradoresAutofill = '1';
    document.head.appendChild(script);
  }

  function install() {
    footer();
    removeNutrition();
    observeExpiry();
    nurse();
    dentalPublic();
    loadResidentsAutofill();
  }

  style();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());