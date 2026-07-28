(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var timer = null;
  var requestId = 0;
  var activeFrame = null;
  var activeTimeout = null;
  var activeNonce = '';
  var localityDisplay = null;

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 15);
  }

  function validCpf(value) {
    var d = onlyDigits(value);
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    var sum = 0;
    var i;
    for (i = 0; i < 9; i++) sum += Number(d.charAt(i)) * (10 - i);
    var first = (sum * 10) % 11;
    if (first === 10) first = 0;
    if (first !== Number(d.charAt(9))) return false;
    sum = 0;
    for (i = 0; i < 10; i++) sum += Number(d.charAt(i)) * (11 - i);
    var second = (sum * 10) % 11;
    if (second === 10) second = 0;
    return second === Number(d.charAt(10));
  }

  function validCns(value) {
    return /^\d{15}$/.test(onlyDigits(value));
  }

  function formatDocument(value) {
    var d = onlyDigits(value);
    if (d.length <= 11) {
      if (d.length > 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
      if (d.length > 6) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
      if (d.length > 3) return d.slice(0, 3) + '.' + d.slice(3);
      return d;
    }
    return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 10) + '.' + d.slice(10, 15);
  }

  function normalizeBirth(value) {
    var text = String(value || '').trim();
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[3] + '/' + match[2] + '/' + match[1];
    match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? match[1] + '/' + match[2] + '/' + match[3] : text;
  }

  function recifeTodayParts() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) {
      values[part.type] = part.value;
    });
    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day)
    };
  }

  function preciseAge(value) {
    var text = normalizeBirth(value);
    var match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    var birthDay = Number(match[1]);
    var birthMonth = Number(match[2]);
    var birthYear = Number(match[3]);
    var validDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

    if (
      validDate.getUTCFullYear() !== birthYear ||
      validDate.getUTCMonth() !== birthMonth - 1 ||
      validDate.getUTCDate() !== birthDay
    ) return null;

    var today = recifeTodayParts();
    var birthStamp = Date.UTC(birthYear, birthMonth - 1, birthDay);
    var todayStamp = Date.UTC(today.year, today.month - 1, today.day);
    if (birthStamp > todayStamp) return null;

    var years = today.year - birthYear;
    var months = today.month - birthMonth;
    var days = today.day - birthDay;

    if (days < 0) {
      months--;
      days += new Date(Date.UTC(today.year, today.month - 1, 0)).getUTCDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years: years, months: months, days: days };
  }

  function unit(value, singular, plural) {
    return value + ' ' + (value === 1 ? singular : plural);
  }

  function preciseAgeText(value) {
    var age = preciseAge(value);
    if (!age) return '';

    if (age.years >= 2) return 'Idade: ' + unit(age.years, 'ano', 'anos');

    if (age.years === 1) {
      var yearText = unit(1, 'ano', 'anos');
      return 'Idade: ' + (age.months ? yearText + ' e ' + unit(age.months, 'mês', 'meses') : yearText);
    }

    if (age.months > 0) {
      var monthText = unit(age.months, 'mês', 'meses');
      return 'Idade: ' + (age.days ? monthText + ' e ' + unit(age.days, 'dia', 'dias') : monthText);
    }

    return 'Idade: ' + unit(age.days, 'dia', 'dias');
  }

  function updatePreciseAge() {
    var birth = document.getElementById('birth');
    var status = document.getElementById('ageStatus');
    if (!birth || !status) return;
    var text = preciseAgeText(birth.value);
    if (!text || status.textContent === text) return;
    status.textContent = text;
    status.className = 'help valid';
  }

  function resizeLocality() {
    if (!localityDisplay) return;
    localityDisplay.style.height = 'auto';
    localityDisplay.style.height = Math.max(96, localityDisplay.scrollHeight) + 'px';
  }

  function setupLocalityField() {
    var original = document.getElementById('locality');
    if (!original) return;

    localityDisplay = document.getElementById('localityDisplay');
    if (localityDisplay) return;

    localityDisplay = document.createElement('textarea');
    localityDisplay.id = 'localityDisplay';
    localityDisplay.rows = 2;
    localityDisplay.value = original.value || '';
    localityDisplay.placeholder = original.placeholder || 'Ex.: Japaranduba';
    localityDisplay.autocomplete = 'street-address';
    localityDisplay.setAttribute('aria-label', 'Localidade / comunidade');
    localityDisplay.style.minHeight = '96px';
    localityDisplay.style.resize = 'vertical';
    localityDisplay.style.whiteSpace = 'pre-wrap';
    localityDisplay.style.overflowWrap = 'anywhere';
    localityDisplay.style.wordBreak = 'break-word';
    localityDisplay.style.overflowY = 'hidden';

    original.hidden = true;
    original.parentNode.insertBefore(localityDisplay, original.nextSibling);

    localityDisplay.addEventListener('input', function () {
      original.value = localityDisplay.value;
      original.dispatchEvent(new Event('input', { bubbles: true }));
      resizeLocality();
    });

    localityDisplay.addEventListener('change', function () {
      original.value = localityDisplay.value;
      original.dispatchEvent(new Event('change', { bubbles: true }));
      resizeLocality();
    });

    resizeLocality();
  }

  function setLocality(value) {
    var original = document.getElementById('locality');
    if (original) original.value = value;
    if (localityDisplay) {
      localityDisplay.value = value;
      resizeLocality();
    }
  }

  function setStatus(status, text, type) {
    status.textContent = text;
    status.className = 'help id-cns-note' + (type ? ' ' + type : '');
  }

  function fillFields(payload) {
    var resident = payload && payload.morador;
    if (!resident || typeof resident !== 'object') return false;

    var values = {
      name: String(resident.nome || '').trim(),
      birth: normalizeBirth(resident.nascimento || resident.dataNascimento || ''),
      locality: String(resident.localidade || resident.endereco || '').trim()
    };

    if (!values.name || !values.birth || !values.locality) return false;

    ['name', 'birth'].forEach(function (id) {
      var field = document.getElementById(id);
      if (!field) return;
      field.value = values[id];
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });

    setLocality(values.locality);
    var locality = document.getElementById('locality');
    if (locality) {
      locality.dispatchEvent(new Event('input', { bubbles: true }));
      locality.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updatePreciseAge();
    setTimeout(updatePreciseAge, 0);
    return true;
  }

  function clearRequest() {
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = null;
    activeNonce = '';
    if (activeFrame) {
      if (activeFrame.parentNode) activeFrame.parentNode.removeChild(activeFrame);
      activeFrame = null;
    }
  }

  function install() {
    var oldInput = document.getElementById('cpf');
    var status = document.getElementById('cpfStatus');
    if (!oldInput || !status || oldInput.dataset.autofillIsolado === '1') return;

    setupLocalityField();

    var birthField = document.getElementById('birth');
    var ageStatus = document.getElementById('ageStatus');
    if (birthField) {
      birthField.addEventListener('input', function () {
        setTimeout(updatePreciseAge, 0);
      });
      birthField.addEventListener('change', function () {
        setTimeout(updatePreciseAge, 0);
      });
    }
    if (ageStatus && window.MutationObserver) {
      new MutationObserver(function () {
        updatePreciseAge();
      }).observe(ageStatus, { childList: true, characterData: true, subtree: true });
    }

    var input = oldInput.cloneNode(true);
    input.dataset.autofillIsolado = '1';
    input.value = '';
    input.maxLength = 18;
    input.placeholder = 'CPF ou CNS';
    oldInput.parentNode.replaceChild(input, oldInput);

    var label = input.closest('label');
    if (label && label.firstChild) label.firstChild.textContent = 'CPF ou CNS ';
    setStatus(status, 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).', '');

    window.addEventListener('message', function (event) {
      if (!activeFrame || event.source !== activeFrame.contentWindow) return;

      var message = event.data;
      if (!message || message.source !== 'portal-tacs-morador' || message.nonce !== activeNonce) return;

      var current = requestId;
      var payload = message.payload;
      clearRequest();
      if (current !== requestId) return;

      if (payload && payload.ok === true && payload.encontrado === true && fillFields(payload)) {
        setStatus(status, (validCns(input.value) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.', 'valid');
      } else if (payload && payload.ok === true && payload.encontrado === false) {
        setStatus(status, 'Cadastro não encontrado. Confira o documento ou preencha os dados manualmente.', 'invalid');
      } else {
        setStatus(status, payload && payload.message ? payload.message : 'Não foi possível completar a consulta. Tente novamente.', 'invalid');
      }
    });

    function lookup() {
      var doc = onlyDigits(input.value);
      if (!(validCpf(doc) || validCns(doc))) return;

      requestId++;
      var current = requestId;
      clearRequest();
      setStatus(status, 'Buscando cadastro...', '');

      var nonce = 'morador-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      var frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = 'Consulta de cadastro';
      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();

      activeNonce = nonce;
      activeFrame = frame;
      activeTimeout = setTimeout(function () {
        if (current !== requestId) return;
        clearRequest();
        setStatus(status, 'A consulta demorou mais que o esperado. Tente novamente.', 'invalid');
      }, 15000);

      document.body.appendChild(frame);
    }

    function refresh() {
      var doc = onlyDigits(input.value);
      clearTimeout(timer);
      clearRequest();
      requestId++;

      if (validCpf(doc) || validCns(doc)) {
        setStatus(status, 'Documento completo. Buscando cadastro...', 'valid');
        timer = setTimeout(lookup, 300);
      } else if (doc.length) {
        setStatus(status, 'Digite um CPF válido ou os 15 números do CNS.', 'invalid');
      } else {
        setStatus(status, 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).', '');
      }
    }

    input.addEventListener('input', function () {
      input.value = formatDocument(input.value);
      refresh();
    });

    input.addEventListener('paste', function () {
      setTimeout(function () {
        input.value = formatDocument(input.value);
        refresh();
      }, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());