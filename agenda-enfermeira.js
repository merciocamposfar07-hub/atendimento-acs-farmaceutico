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

  function expireNotices() {
    var c = clock();
    if (c.minutes < 720) return;
    var a = document.getElementById('noticeArea');
    if (!a) return;
    Array.prototype.forEach.call(a.querySelectorAll('.notice-card'), function (card) {
      var t = String(card.textContent || '').toLowerCase();
      if (t.indexOf(c.br) !== -1 || t.indexOf(c.iso) !== -1 || /\bhoje\b/.test(t)) card.remove();
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

  function validCpf(value) {
    var d = String(value || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    var s = 0, i;
    for (i = 0; i < 9; i++) s += Number(d[i]) * (10 - i);
    var a = (s * 10) % 11;
    if (a === 10) a = 0;
    if (a !== Number(d[9])) return false;
    s = 0;
    for (i = 0; i < 10; i++) s += Number(d[i]) * (11 - i);
    var b = (s * 10) % 11;
    if (b === 10) b = 0;
    return b === Number(d[10]);
  }

  function installCpfCns() {
    var input = document.getElementById('cpf');
    var status = document.getElementById('cpfStatus');
    if (!input || !status) return;

    var label = input.closest('label');
    if (label && label.firstChild) label.firstChild.textContent = 'CPF ou CNS ';
    input.maxLength = 18;
    input.placeholder = 'CPF ou CNS';
    status.textContent = 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).';
    status.className = 'help id-cns-note';

    var timer = null;
    var sequence = 0;
    var activeScript = null;
    var activeTimeout = null;

    function digits() { return String(input.value || '').replace(/\D/g, '').slice(0, 15); }
    function isCns(value) { return /^\d{15}$/.test(value); }

    function format() {
      var d = digits();
      if (d.length <= 11) {
        input.value = d.length > 9 ? d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9) : d.length > 6 ? d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + '.' + d.slice(3) : d;
      } else {
        input.value = d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 10) + '.' + d.slice(10, 15);
      }
    }

    function fieldValue(data, names) {
      for (var i = 0; i < names.length; i++) {
        var value = data && data[names[i]];
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
      }
      return '';
    }

    function normalizeBirth(value) {
      var text = String(value || '').trim();
      var m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[3] + '/' + m[2] + '/' + m[1];
      m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      return m ? m[1] + '/' + m[2] + '/' + m[3] : text;
    }

    function fillResident(data) {
      var resident = data && (data.morador || data.residente || data.dados || data.data);
      if (!resident || typeof resident !== 'object') return false;
      var name = fieldValue(resident, ['nome', 'NOME', 'nomeCompleto', 'nome_completo']);
      var birth = normalizeBirth(fieldValue(resident, ['nascimento', 'dataNascimento', 'data_nascimento', 'DATA NASCIMENTO', 'DATA_NASCIMENTO']));
      var locality = fieldValue(resident, ['localidade', 'endereco', 'endereço', 'ENDERECO', 'ENDEREÇO', 'comunidade']);
      if (!name || !birth || !locality) return false;

      var values = { name: name, birth: birth, locality: locality };
      Object.keys(values).forEach(function (id) {
        var field = document.getElementById(id);
        if (!field) return;
        field.value = values[id];
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      return true;
    }

    function clearActiveRequest(delayRemoval) {
      if (activeTimeout) clearTimeout(activeTimeout);
      activeTimeout = null;
      if (activeScript) {
        activeScript.onerror = null;
        var scriptToRemove = activeScript;
        activeScript = null;
        setTimeout(function () {
          if (scriptToRemove.parentNode) scriptToRemove.parentNode.removeChild(scriptToRemove);
        }, delayRemoval ? 50 : 0);
      }
    }

    function lookup() {
      var doc = digits();
      if (!(validCpf(doc) || isCns(doc))) return;

      var current = ++sequence;
      clearActiveRequest(false);
      status.textContent = 'Buscando seus dados na Unidade de Saúde...';
      status.className = 'help id-cns-note';

      var callbackName = 'moradorTacs' + Date.now() + Math.floor(Math.random() * 100000);
      var completed = false;

      window[callbackName] = function (data) {
        if (completed || current !== sequence) return;
        completed = true;
        clearActiveRequest(true);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }

        if (data && data.ok === true && data.encontrado === true && fillResident(data)) {
          status.textContent = (isCns(doc) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.';
          status.className = 'help id-cns-note valid';
        } else {
          status.textContent = 'Cadastro não encontrado. Confira o documento ou preencha os dados manualmente.';
          status.className = 'help id-cns-note invalid';
        }
      };

      activeScript = document.createElement('script');
      activeScript.type = 'text/javascript';
      activeScript.async = true;
      activeScript.onerror = function () {
        if (completed || current !== sequence) return;
        completed = true;
        clearActiveRequest(false);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        status.textContent = 'Não foi possível consultar agora. Tente novamente.';
        status.className = 'help id-cns-note invalid';
      };
      activeScript.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();

      activeTimeout = setTimeout(function () {
        if (completed || current !== sequence) return;
        completed = true;
        clearActiveRequest(false);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        status.textContent = 'A consulta demorou mais que o esperado. Tente novamente.';
        status.className = 'help id-cns-note invalid';
      }, 15000);

      document.head.appendChild(activeScript);
    }

    function refresh() {
      var d = digits();
      var ok = validCpf(d) || isCns(d);
      clearTimeout(timer);
      sequence++;
      clearActiveRequest(false);
      if (ok) {
        status.textContent = (isCns(d) ? 'CNS informado ✓' : 'CPF conferido ✓') + ' Buscando cadastro...';
        status.className = 'help id-cns-note valid';
        timer = setTimeout(lookup, 350);
      } else {
        status.textContent = d.length ? 'Digite um CPF válido ou os 15 números do CNS.' : 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).';
        status.className = 'help id-cns-note' + (d.length ? ' invalid' : '');
      }
    }

    input.addEventListener('input', function (event) {
      if (digits().length > 11) event.stopImmediatePropagation();
      format();
      refresh();
    }, true);
    refresh();
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

  function install() {
    footer();
    removeNutrition();
    installCpfCns();
    observeExpiry();
    nurse();
  }

  style();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());